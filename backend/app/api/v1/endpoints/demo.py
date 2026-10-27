from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import roles
from app.db.session import get_db, engine, Base
from app.db.seed import seed_database
from app.models.models import User, Patient, PatientVisit, Room, Alert, ServiceOrder, Camera, DemoState
from app.services.domain import (clock, set_clock, uid, event, audit, enqueue, close_step,
    active_step, refresh_metrics, synchronized)

router = APIRouter(dependencies=[Depends(roles("operator", "director", "analyst", "department_manager", "maintenance"))])


def demo_only():
    if not settings.DEMO_MODE:
        raise HTTPException(404)


def arrival(db):
    now = clock(db)
    patient = Patient(id=uid("PAT"), patient_code=uid("BN"), full_name="Người bệnh đến thêm · dữ liệu giả lập", dob="1990-01-01", gender="Không xác định")
    db.add(patient)
    db.flush()
    visit = PatientVisit(id=uid("VISIT"), patient_id=patient.id, visit_code=uid("KB"),
        ticket_number=f"A{db.query(PatientVisit).count() + 1:03d}", payment_type="bhyt",
        registered_at=now - timedelta(minutes=25), total_waiting_time=0, total_service_time=0)
    db.add(visit)
    db.flush()
    enqueue(db, visit, "ROOM-LAB-101")
    db.add(ServiceOrder(id=uid("ORDER"), visit_id=visit.id, service_type="laboratory", description="Chỉ định xét nghiệm giả lập",
        status="ordered", created_at=now - timedelta(minutes=3), updated_at=now))
    event(db, "demo_arrival", f"Tạo lượt đến giả lập {visit.ticket_number}", "ROOM-LAB-101", visit.id)


@router.get("/state")
def state(db: Session = Depends(get_db)):
    record = db.get(DemoState, "clock")
    return {**record.data, "data_mode": "synthetic", "spare_staff": 2, "spare_counters": 2,
        "clock_note": "Đồng hồ mô phỏng dùng chung; không phải dữ liệu trực tiếp của bệnh viện"}


@router.post("/trigger-congestion")
@synchronized
def congestion(user: User = Depends(roles("operator", "department_manager")), db: Session = Depends(get_db)):
    demo_only()
    for _ in range(18):
        arrival(db)
    cam = db.get(Camera, "CAM-LAB-01")
    if cam:
        cam.people_count += 20
        cam.last_update = clock(db)
    refresh_metrics(db)
    audit(db, user, "TRIGGER_CONGESTION", "Tạo 18 lượt khám giả lập có chỉ định")
    db.commit()
    return {"message": "Đã thêm 18 lượt khám giả lập vào khu lấy mẫu", "queue_length": db.get(Room, "ROOM-LAB-101").current_queue_length}


@router.post("/trigger-ct-incident")
@synchronized
def ct_incident(user: User = Depends(roles("operator", "maintenance", "department_manager")), db: Session = Depends(get_db)):
    demo_only()
    room = db.get(Room, "ROOM-IMG-302")
    if room.status == "offline":
        return {"message": "Sự cố CT đang mở", "status": "offline"}
    room.status = "offline"
    alert = db.get(Alert, "CT-INCIDENT")
    if not alert:
        alert = Alert(id="CT-INCIDENT", room_id=room.id, title="Máy CT tạm dừng · sự cố mô phỏng",
            description="Người dùng kích hoạt sự cố cho trình diễn; không suy đoán nguyên nhân kỹ thuật.", severity="critical", created_at=clock(db))
        db.add(alert)
    alert.status = "active"
    event(db, "equipment_offline", "Máy CT chuyển sang trạng thái ngừng hoạt động mô phỏng", room.id)
    audit(db, user, "EQUIPMENT_OFFLINE", room.id)
    db.commit()
    return {"message": "Đã kích hoạt sự cố CT giả lập", "status": "offline"}


@router.post("/restore-ct")
@synchronized
def restore_ct(user: User = Depends(roles("operator", "maintenance", "department_manager")), db: Session = Depends(get_db)):
    demo_only()
    room = db.get(Room, "ROOM-IMG-302")
    room.status = "normal"
    alert = db.get(Alert, "CT-INCIDENT")
    if alert:
        alert.status = "resolved"
    event(db, "equipment_restored", "Đã khôi phục CT trong demo", room.id)
    audit(db, user, "EQUIPMENT_RESTORED", room.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã khôi phục CT", "status": room.status}


class ClockRequest(BaseModel):
    running: bool
    speed: int = Field(default=1, ge=1, le=10)


@router.post("/clock")
@synchronized
def control_clock(req: ClockRequest, user: User = Depends(roles("operator")), db: Session = Depends(get_db)):
    demo_only()
    record = db.get(DemoState, "clock")
    record.data = {**record.data, "running": req.running, "speed": req.speed}
    audit(db, user, "DEMO_CLOCK", f"running={req.running}, speed={req.speed}")
    db.commit()
    return record.data


class TickRequest(BaseModel):
    minutes: int = Field(default=5, ge=1, le=30)


@router.post("/tick")
@synchronized
def tick(req: TickRequest, user: User = Depends(roles("operator")), db: Session = Depends(get_db)):
    demo_only()
    set_clock(db, clock(db) + timedelta(minutes=req.minutes))
    lab = db.get(Room, "ROOM-LAB-101")
    for visit in db.query(PatientVisit).filter_by(current_room_id=lab.id, status="in_service").all():
        step = active_step(db, visit)
        if step.started_at and (clock(db) - step.started_at).total_seconds() >= 8 * 60:
            close_step(db, visit)
            for order in db.query(ServiceOrder).filter_by(visit_id=visit.id, status="ordered").all():
                order.status, order.updated_at = "processing", clock(db)
            enqueue(db, visit, "ROOM-RES-101", "Xử lý xét nghiệm", "waiting_for_result")
            event(db, "sample_collected", "Đồng hồ demo hoàn tất lấy mẫu", lab.id, visit.id)
    serving = db.query(PatientVisit).filter_by(current_room_id=lab.id, status="in_service").count()
    free = max(0, min(lab.counters, lab.active_staff) - serving)
    waiting = db.query(PatientVisit).filter_by(current_room_id=lab.id, status="waiting").order_by(PatientVisit.registered_at).limit(free).all()
    for visit in waiting:
        step = active_step(db, visit)
        step.started_at, step.status, visit.status = clock(db), "in_service", "in_service"
        step.waiting_duration_minutes = (clock(db) - step.queued_at).total_seconds() / 60
        event(db, "service_started", f"Đồng hồ demo bắt đầu {visit.ticket_number}", lab.id, visit.id)
    for cam in db.query(Camera).filter(Camera.is_online.is_(True)).all():
        cam.last_update = clock(db)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã tiến đồng hồ mô phỏng", "now": clock(db).isoformat(), "queue_length": lab.current_queue_length}


@router.post("/reset")
@synchronized
def reset(response: Response, user: User = Depends(roles()), db: Session = Depends(get_db)):
    demo_only()
    user_id = user.id
    db.rollback()
    db.close()
    Base.metadata.drop_all(bind=engine)
    seed_database()
    from app.api.v1.endpoints.auth import issue_session
    result = issue_session(db.get(User, user_id), db, response)
    return {**result, "message": "Đã khôi phục dữ liệu giả lập; phiên đăng nhập đã được tạo lại"}
