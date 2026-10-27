"""Shared synthetic operational state. All screens derive metrics from these records."""
from datetime import datetime, timedelta
from statistics import median
from uuid import uuid4
from functools import wraps
from threading import RLock
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import DemoState, PatientVisit, StepExecution, Room, Camera, Alert, OperationalEvent, AuditLog

SERVICE_ROOMS = ["ROOM-REC-101", "ROOM-INS-101", "ROOM-EXAM-101", "ROOM-LAB-101", "ROOM-RES-101", "ROOM-PAY-101", "ROOM-PHAR-101", "ROOM-IMG-302"]
ROOM_LABELS = {"ROOM-REC-101": "Đăng ký khám", "ROOM-INS-101": "Xác minh BHYT", "ROOM-EXAM-101": "Khám chuyên khoa", "ROOM-LAB-101": "Lấy mẫu xét nghiệm", "ROOM-RES-101": "Chờ kết quả", "ROOM-PAY-101": "Thanh toán", "ROOM-PHAR-101": "Nhận thuốc", "ROOM-IMG-302": "Chụp CT"}
ACTIVE_WAIT = ("waiting", "called")
mutation_lock = RLock()


def synchronized(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        with mutation_lock:
            return fn(*args, **kwargs)
    return wrapped


def uid(prefix):
    return f"{prefix}-{uuid4().hex[:16]}"


def clock(db: Session):
    state = db.get(DemoState, "clock")
    return datetime.fromisoformat(state.data["now"]) if state else datetime.now().replace(microsecond=0)


def set_clock(db: Session, value: datetime):
    state = db.get(DemoState, "clock")
    data = dict(state.data) if state else {"running": False, "speed": 1}
    data["now"] = value.isoformat()
    if state:
        state.data = data
    else:
        db.add(DemoState(id="clock", data=data))


def event(db: Session, kind: str, description: str, room_id=None, visit_id=None, payload=None):
    item = OperationalEvent(id=uid("EVT"), event_type=kind, description=description,
        room_id=room_id, visit_id=visit_id, payload=payload or {}, timestamp=clock(db))
    db.add(item)
    return item


def audit(db: Session, user, action, details):
    db.add(AuditLog(id=uid("AUD"), user_id=user.id, user_role=user.role,
        action=action, details=details, timestamp=clock(db)))


def active_step(db: Session, visit: PatientVisit):
    return db.get(StepExecution, visit.current_step_id) if visit.current_step_id else None


def enqueue(db: Session, visit: PatientVisit, room_id: str, label=None, status="waiting"):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(422, "Phòng không tồn tại")
    step = StepExecution(id=uid("STEP"), visit_id=visit.id, room_id=room_id,
        step_name=label or ROOM_LABELS.get(room_id, room.name), status=status, queued_at=clock(db))
    db.add(step)
    visit.current_step_id = step.id
    visit.current_room_id = room_id
    visit.status = status
    event(db, "queue_entered", f"{visit.ticket_number}: {step.step_name}", room_id, visit.id)
    return step


def close_step(db: Session, visit: PatientVisit):
    step = active_step(db, visit)
    if step:
        if not step.started_at:
            step.started_at = clock(db)
        step.completed_at = clock(db)
        step.status = "completed"
        step.waiting_duration_minutes = max(0, (step.started_at - step.queued_at).total_seconds() / 60)
        step.service_duration_minutes = max(0, (step.completed_at - step.started_at).total_seconds() / 60)
        event(db, "service_completed", f"Hoàn tất {step.step_name}: {visit.ticket_number}", step.room_id, visit.id)


def totals(db: Session, visit: PatientVisit):
    db.flush()
    steps = db.query(StepExecution).filter(StepExecution.visit_id == visit.id).all()
    visit.total_waiting_time = sum(s.waiting_duration_minutes or 0 for s in steps)
    visit.total_service_time = sum(s.service_duration_minutes or 0 for s in steps)


def room_metrics(db: Session, room: Room):
    waiting = db.query(PatientVisit).filter(PatientVisit.current_room_id == room.id, PatientVisit.status.in_(ACTIVE_WAIT)).count()
    serving = db.query(PatientVisit).filter(PatientVisit.current_room_id == room.id, PatientVisit.status == "in_service").count()
    results = db.query(PatientVisit).filter(PatientVisit.current_room_id == room.id, PatientVisit.status == "waiting_for_result").count()
    samples = db.query(StepExecution).filter(StepExecution.room_id == room.id,
        StepExecution.started_at.is_not(None), StepExecution.status == "completed").all()
    waits = [max(0, (s.started_at - s.queued_at).total_seconds() / 60) for s in samples]
    current = db.query(StepExecution).join(PatientVisit, PatientVisit.current_step_id == StepExecution.id).filter(
        StepExecution.room_id == room.id, PatientVisit.status.in_(ACTIVE_WAIT)).all()
    current_ages = [max(0, (clock(db) - s.queued_at).total_seconds() / 60) for s in current]
    med = round(median(waits), 1) if waits else 0.0
    cams = db.query(Camera).filter(Camera.room_id == room.id, Camera.is_online.is_(True)).all()
    return {"queue_length": waiting, "being_served": serving, "waiting_for_results": results, "median_waiting_time": med,
        "median_current_wait_age": round(median(current_ages), 1) if current_ages else 0,
        "sample_size": len(waits), "people_present": cams[0].people_count if cams else None,
        "source": "synthetic_step_events", "data_mode": "synthetic", "measured_at": clock(db).isoformat()}


def refresh_metrics(db: Session, record_history=True):
    db.flush()
    now = clock(db)
    for room in db.query(Room).all():
        metric = room_metrics(db, room)
        room.current_queue_length = metric["queue_length"]
        room.current_waiting_time = metric["median_waiting_time"]
        if room.status != "offline":
            room.status = "congested" if metric["queue_length"] > 50 else "busy" if metric["queue_length"] > 20 else "normal"
        if record_history and room.id in SERVICE_ROOMS:
            event(db, "queue_snapshot", "Ảnh chụp trạng thái hàng đợi mô phỏng", room.id,
                payload={"count": metric["queue_length"], "waiting_minutes": metric["median_waiting_time"]})
        for name, value, threshold in (("queue_length", metric["queue_length"], 50), ("waiting_time", metric["median_waiting_time"], 30)):
            alert_id = f"ALERT-{room.id}-{name}"
            alert = db.get(Alert, alert_id)
            exceeded = value > threshold
            if exceeded and not alert:
                alert = Alert(id=alert_id, room_id=room.id, metric_name=name, created_at=now)
                db.add(alert)
            if alert:
                alert.metric_value = value
                alert.threshold = threshold
                alert.status = "active" if exceeded else "resolved"
                alert.title = f"{room.name}: {'hàng đợi cao' if name == 'queue_length' else 'thời gian chờ cao'}"
                alert.description = f"{value:g} {'người' if name == 'queue_length' else 'phút'}; ngưỡng demo {threshold}. Nguồn: sự kiện tổng hợp."
                alert.severity = "critical" if name == "queue_length" else "warning"
    db.flush()


def public_visit(db: Session, visit: PatientVisit):
    step = active_step(db, visit)
    return {"id": visit.id, "patient_id": visit.patient_id,
        "patient_code": visit.patient.patient_code, "patient_name": visit.patient.full_name,
        "ticket_number": visit.ticket_number, "payment_type": visit.payment_type,
        "current_room_id": visit.current_room_id, "current_step_id": visit.current_step_id,
        "current_step": step.step_name if step else "Đã hoàn tất", "status": visit.status,
        "registered_at": visit.registered_at.strftime("%H:%M:%S"),
        "registered_at_iso": visit.registered_at.isoformat(),
        "total_waiting_time": round(visit.total_waiting_time or 0, 1), "data_mode": "synthetic"}
