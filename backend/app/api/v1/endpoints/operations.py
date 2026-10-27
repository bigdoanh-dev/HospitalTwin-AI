from datetime import date, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import current_user, roles
from app.models.models import User, Patient, PatientVisit, StepExecution, ServiceOrder, Room
from app.services.domain import (uid, clock, set_clock, active_step, enqueue, close_step,
    event, audit, totals, refresh_metrics, public_visit, synchronized)

router = APIRouter(dependencies=[Depends(current_user)])
STAFF = ("operator", "receptionist", "doctor", "lab_staff", "department_manager", "cashier", "pharmacy_staff")


class RegisterPatientRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    gender: str = "Không xác định"
    dob: date = date(1990, 1, 1)
    phone: str | None = None
    payment_type: Literal["bhyt", "service", "hybrid"] = "bhyt"
    chief_complaint: str = Field(default="Lượt khám trình diễn", max_length=300)
    patient_id: str | None = None


class QueueActionRequest(BaseModel):
    visit_id: str
    room_id: str | None = None
    reason: str | None = None
    action: Literal["paused", "no_show", "cancelled", "transferred", "resume"] | None = None
    target_room_id: str | None = None
    needs_lab: bool = False


class LabOrderRequest(BaseModel):
    visit_id: str
    test_type: str = Field(default="Xét nghiệm minh họa", max_length=120)
    test_types: list[str] | None = None


def get_visit(db, vid, room_id=None):
    visit = db.get(PatientVisit, vid)
    if not visit:
        raise HTTPException(404, "Không tìm thấy lượt khám")
    if room_id and visit.current_room_id != room_id:
        raise HTTPException(409, "Lượt khám không thuộc hàng đợi của phòng này")
    return visit


def check_room_role(user, room):
    permissions = {"receptionist": {"registration", "insurance"}, "doctor": {"consultation"},
        "lab_staff": {"laboratory", "result_review"}, "cashier": {"payment"}, "pharmacy_staff": {"pharmacy"}}
    if user.role in permissions and room.room_type not in permissions[user.role]:
        raise HTTPException(403, "Vai trò không được tác nghiệp tại phòng này")


def serialize(db, visit):
    result = public_visit(db, visit)
    orders = db.query(ServiceOrder).filter(ServiceOrder.visit_id == visit.id).all()
    result["orders"] = [{"id": o.id, "status": o.status, "description": o.description, "service_type": o.service_type} for o in orders]
    return result


@router.get("/visits")
def list_visits(status: str | None = None, room_id: str | None = None,
    limit: int = Query(500, ge=1, le=500), user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(PatientVisit)
    if user.role == "patient":
        q = q.filter(PatientVisit.patient_id == user.patient_id)
    if status:
        q = q.filter(PatientVisit.status == status)
    if room_id:
        q = q.filter(PatientVisit.current_room_id == room_id)
    return [serialize(db, visit) for visit in q.order_by(PatientVisit.registered_at.desc()).limit(limit).all()]


@router.get("/my-visit")
def my_visit(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.patient_id:
        raise HTTPException(403, "Tài khoản không liên kết hồ sơ người bệnh")
    visit = db.query(PatientVisit).filter(PatientVisit.patient_id == user.patient_id).order_by(PatientVisit.registered_at.desc()).first()
    return visit_details(visit.id, user, db) if visit else None


@router.get("/visits/{visit_id}")
def visit_details(visit_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    visit = get_visit(db, visit_id)
    if user.role == "patient" and visit.patient_id != user.patient_id:
        raise HTTPException(403, "Chỉ được xem lượt khám của chính mình")
    result = serialize(db, visit)
    result["steps"] = [{"id": s.id, "name": s.step_name, "room_id": s.room_id, "status": s.status,
        "queued_at": s.queued_at.isoformat(), "started_at": s.started_at.isoformat() if s.started_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "waiting_minutes": s.waiting_duration_minutes, "service_minutes": s.service_duration_minutes}
        for s in sorted(visit.step_executions, key=lambda s: s.queued_at)]
    return result


@router.post("/register")
@synchronized
def register_patient(req: RegisterPatientRequest, user: User = Depends(roles("operator", "receptionist")), db: Session = Depends(get_db)):
    if not req.full_name.strip():
        raise HTTPException(422, "Tên không được để trống")
    if req.dob > clock(db).date():
        raise HTTPException(422, "Ngày sinh không hợp lệ")
    patient = db.get(Patient, req.patient_id) if req.patient_id else None
    if req.patient_id and not patient:
        raise HTTPException(404, "Không tìm thấy hồ sơ người bệnh")
    if not patient:
        pid = uid("PAT")
        patient = Patient(id=pid, patient_code=f"BN-{pid[-6:].upper()}", full_name=req.full_name.strip(),
            dob=str(req.dob), gender=req.gender, phone=req.phone)
        db.add(patient)
        db.flush()
    count = db.query(PatientVisit).count() + 1
    visit = PatientVisit(id=uid("VISIT"), patient_id=patient.id, visit_code=uid("KB"),
        ticket_number=f"A{count:03d}", payment_type=req.payment_type,
        chief_complaint=req.chief_complaint, registered_at=clock(db), total_waiting_time=0, total_service_time=0)
    db.add(visit)
    db.flush()
    enqueue(db, visit, "ROOM-REC-101")
    event(db, "patient_registered", f"Đăng ký {visit.ticket_number}", visit_id=visit.id)
    audit(db, user, "REGISTER_VISIT", visit.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã tạo lượt khám giả lập", "visit_id": visit.id, "ticket_number": visit.ticket_number}


@router.post("/queue/call")
@synchronized
def call_patient(req: QueueActionRequest, user: User = Depends(roles(*STAFF)), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id, req.room_id)
    room = db.get(Room, visit.current_room_id)
    check_room_role(user, room)
    if visit.status != "waiting":
        raise HTTPException(409, "Chỉ được gọi lượt đang chờ")
    if room.status == "offline":
        raise HTTPException(409, "Thiết bị/phòng đang ngừng hoạt động")
    visit.status = "called"
    active_step(db, visit).status = "called"
    event(db, "patient_called", f"Mời {visit.ticket_number}", room.id, visit.id)
    refresh_metrics(db)
    db.commit()
    return {"message": f"Đã gọi {visit.ticket_number}", "status": visit.status}


@router.post("/queue/start")
@synchronized
def start_service(req: QueueActionRequest, user: User = Depends(roles(*STAFF)), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id, req.room_id)
    room = db.get(Room, visit.current_room_id)
    check_room_role(user, room)
    if visit.status != "called":
        raise HTTPException(409, "Cần gọi người bệnh trước khi bắt đầu")
    if room.status == "offline" or room.counters < 1 or room.active_staff < 1:
        raise HTTPException(409, "Phòng chưa có nguồn lực khả dụng")
    serving = db.query(PatientVisit).filter(PatientVisit.current_room_id == room.id, PatientVisit.status == "in_service").count()
    if serving >= min(room.counters, room.active_staff):
        raise HTTPException(409, "Các quầy đang phục vụ đủ công suất")
    if room.room_type == "laboratory" and not db.query(ServiceOrder).filter_by(visit_id=visit.id, status="ordered").first():
        raise HTTPException(409, "Chưa có chỉ định xét nghiệm")
    step = active_step(db, visit)
    step.status, step.started_at = "in_service", clock(db)
    step.waiting_duration_minutes = max(0, (step.started_at - step.queued_at).total_seconds() / 60)
    visit.status, visit.started_at = "in_service", visit.started_at or clock(db)
    event(db, "service_started", f"Bắt đầu {step.step_name}: {visit.ticket_number}", room.id, visit.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã bắt đầu phục vụ", "status": visit.status}


def create_orders(db, visit, tests):
    for test in tests:
        db.add(ServiceOrder(id=uid("ORDER"), visit_id=visit.id, service_type="laboratory",
            description=test, status="ordered", created_at=clock(db), updated_at=clock(db)))
    close_step(db, visit)
    enqueue(db, visit, "ROOM-LAB-101")
    event(db, "lab_order_created", f"{visit.ticket_number}: {len(tests)} chỉ định demo", "ROOM-LAB-101", visit.id)


@router.post("/doctor/order-lab")
@synchronized
def order_lab(req: LabOrderRequest, user: User = Depends(roles("operator", "doctor")), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id)
    room = db.get(Room, visit.current_room_id)
    if room.room_type != "consultation" or visit.status != "in_service":
        raise HTTPException(409, "Chỉ tạo chỉ định trong bước khám đang thực hiện")
    tests = req.test_types or [req.test_type]
    if not 1 <= len(tests) <= 5 or any(not text.strip() for text in tests):
        raise HTTPException(422, "Cần từ 1 đến 5 chỉ định hợp lệ")
    create_orders(db, visit, tests)
    audit(db, user, "CREATE_DEMO_ORDER", visit.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã chuyển sang hàng đợi lấy mẫu", "room_id": visit.current_room_id}


@router.post("/queue/complete")
@synchronized
def complete_service(req: QueueActionRequest, user: User = Depends(roles(*STAFF)), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id, req.room_id)
    room = db.get(Room, visit.current_room_id)
    check_room_role(user, room)
    if visit.status != "in_service":
        raise HTTPException(409, "Chỉ hoàn tất bước đang phục vụ")
    set_clock(db, clock(db) + timedelta(minutes=2))
    if room.room_type == "consultation" and req.needs_lab:
        create_orders(db, visit, ["Xét nghiệm demo"])
    else:
        close_step(db, visit)
        next_room = {"registration": "ROOM-INS-101" if visit.payment_type != "service" else "ROOM-EXAM-101",
            "insurance": "ROOM-EXAM-101", "consultation": "ROOM-PAY-101", "payment": "ROOM-PHAR-101"}.get(room.room_type)
        if room.room_type == "laboratory":
            orders = db.query(ServiceOrder).filter_by(visit_id=visit.id, status="ordered").all()
            if not orders:
                raise HTTPException(409, "Chưa có chỉ định để lấy mẫu")
            for order in orders:
                order.status, order.updated_at = "collected", clock(db)
            enqueue(db, visit, "ROOM-RES-101", "Chờ xử lý mẫu", status="waiting_for_result")
            event(db, "sample_collected", f"Đã lấy mẫu {visit.ticket_number}", room.id, visit.id)
        elif next_room:
            if room.room_type == "consultation":
                for order in db.query(ServiceOrder).filter_by(visit_id=visit.id, status="ready").all():
                    order.status, order.updated_at = "reviewed", clock(db)
            enqueue(db, visit, next_room)
        elif room.room_type == "pharmacy":
            visit.status, visit.completed_at, visit.current_step_id = "completed", clock(db), None
            event(db, "visit_completed", f"Hoàn tất lượt {visit.ticket_number}", room.id, visit.id)
        else:
            raise HTTPException(409, "Bước này cần thao tác chuyên biệt")
    totals(db, visit)
    audit(db, user, "COMPLETE_STEP", visit.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã hoàn tất và cập nhật bước tiếp theo", "status": visit.status, "room_id": visit.current_room_id}


@router.post("/lab/process")
@synchronized
def process_sample(req: QueueActionRequest, user: User = Depends(roles("operator", "lab_staff")), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id)
    orders = db.query(ServiceOrder).filter_by(visit_id=visit.id, status="collected").all()
    if not orders:
        raise HTTPException(409, "Chỉ xử lý mẫu đã được lấy")
    for order in orders:
        order.status, order.updated_at = "processing", clock(db)
    step = active_step(db, visit)
    step.started_at, step.step_name = clock(db), "Xử lý xét nghiệm"
    event(db, "lab_processing", f"Đang xử lý mẫu {visit.ticket_number}", "ROOM-RES-101", visit.id)
    db.commit()
    return {"message": "Mẫu đang xử lý", "status": "processing"}


@router.post("/lab/result-ready")
@synchronized
def result_ready(req: QueueActionRequest, user: User = Depends(roles("operator", "lab_staff")), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id)
    orders = db.query(ServiceOrder).filter_by(visit_id=visit.id).all()
    if not orders or any(o.status != "processing" for o in orders):
        raise HTTPException(409, "Kết quả chỉ được hoàn tất sau khi mẫu bắt đầu xử lý")
    set_clock(db, clock(db) + timedelta(minutes=15))
    for order in orders:
        order.status, order.updated_at = "ready", clock(db)
    close_step(db, visit)
    enqueue(db, visit, "ROOM-EXAM-101", "Khám lại sau khi có kết quả")
    event(db, "lab_result_ready", f"Kết quả giả lập của {visit.ticket_number} sẵn sàng", "ROOM-RES-101", visit.id)
    totals(db, visit)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã có kết quả demo, mời quay lại phòng khám", "room_id": visit.current_room_id, "status": visit.status}


@router.post("/queue/action")
@synchronized
def queue_action(req: QueueActionRequest, user: User = Depends(roles(*STAFF)), db: Session = Depends(get_db)):
    visit = get_visit(db, req.visit_id, req.room_id)
    if visit.status in ("completed", "cancelled"):
        raise HTTPException(409, "Lượt đã kết thúc")
    if not req.action or (req.action != "resume" and not (req.reason or "").strip()):
        raise HTTPException(422, "Thao tác cần có lý do")
    if req.action == "transferred":
        target = db.get(Room, req.target_room_id)
        if not target or target.room_type != db.get(Room, visit.current_room_id).room_type:
            raise HTTPException(422, "Chỉ chuyển sang điểm phục vụ cùng loại")
        close_step(db, visit)
        enqueue(db, visit, target.id)
    elif req.action == "resume":
        if visit.status not in ("paused", "no_show"):
            raise HTTPException(409, "Lượt không ở trạng thái tạm hoãn/vắng mặt")
        visit.status, active_step(db, visit).status = "waiting", "waiting"
    else:
        visit.status = req.action
        active_step(db, visit).status = req.action
    event(db, f"queue_{req.action}", req.reason or "Tiếp tục hàng đợi", visit.current_room_id, visit.id)
    audit(db, user, "QUEUE_ACTION", f"{visit.id}: {req.action}")
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã cập nhật", "status": visit.status}
