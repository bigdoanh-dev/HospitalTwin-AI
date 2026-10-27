from datetime import timedelta
from statistics import median
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import roles
from app.models.models import Room, PatientVisit, StepExecution, Alert, OperationalEvent
from app.services.domain import clock, room_metrics, ACTIVE_WAIT, SERVICE_ROOMS

VIEW_ROLES = ("director", "operator", "analyst", "department_manager", "maintenance", "camera_operator", "receptionist", "doctor", "lab_staff", "cashier", "pharmacy_staff")
router = APIRouter(dependencies=[Depends(roles(*VIEW_ROLES))])


def room_scope(db, floor_id=None, department_id=None):
    q = db.query(Room)
    if floor_id and floor_id not in ("all", "All"):
        fid = floor_id if floor_id.startswith("FL-") else f"FL-{floor_id}"
        q = q.filter(Room.floor_id == fid)
    if department_id:
        q = q.filter(Room.department_id == department_id)
    return q.all()


def queue_history(db, room_id):
    now = clock(db)
    steps = db.query(StepExecution).filter(StepExecution.room_id == room_id).all()
    result = []
    for n in range(13):
        point = now - timedelta(minutes=15 * (12 - n))
        count = sum(s.queued_at <= point and (s.started_at is None or s.started_at > point)
            and s.status not in ("cancelled", "paused", "no_show", "waiting_for_result") for s in steps)
        result.append({"time": point.strftime("%H:%M"), "timestamp": point.isoformat(), "count": count,
            "data_mode": "synthetic", "source": "step_execution_timestamps"})
    room = db.get(Room, room_id)
    if room:
        result[-1]["count"] = room_metrics(db, room)["queue_length"]
    return result


@router.get("/overview")
def overview(floor_id: str | None = None, department_id: str | None = None, db: Session = Depends(get_db)):
    now = clock(db)
    rooms = room_scope(db, floor_id, department_id)
    ids = [r.id for r in rooms]
    visits_q = db.query(PatientVisit)
    if floor_id or department_id:
        visits_q = visits_q.filter(PatientVisit.current_room_id.in_(ids))
    visits = visits_q.all()
    completed = [v for v in visits if v.status == "completed"]
    waiting = [v for v in visits if v.status in ACTIVE_WAIT]
    steps = db.query(StepExecution).filter(StepExecution.room_id.in_(ids), StepExecution.status == "completed",
        StepExecution.started_at.is_not(None)).all()
    waits = [(s.started_at - s.queued_at).total_seconds() / 60 for s in steps]
    med = round(median(waits), 1) if waits else 0
    completion = round(len(completed) / max(1, len(visits)) * 100, 1)
    points = [now - timedelta(minutes=15 * (5 - n)) for n in range(6)]
    arrival_series = [sum(v.registered_at <= t for v in visits) for t in points]
    completion_series = [round(100 * sum(v.completed_at is not None and v.completed_at <= t for v in visits) /
        max(1, sum(v.registered_at <= t for v in visits)), 1) for t in points]
    all_steps = db.query(StepExecution).filter(StepExecution.room_id.in_(ids)).all()
    waiting_series = [sum(s.queued_at <= t and (s.started_at is None or s.started_at > t)
        and s.status not in ("cancelled", "paused", "no_show", "waiting_for_result") for s in all_steps) for t in points]
    waiting_series[-1] = len(waiting)
    wait_series = [round(median([(s.started_at - s.queued_at).total_seconds() / 60 for s in steps if s.started_at <= t]), 1)
        if any(s.started_at <= t for s in steps) else 0 for t in points]
    definitions = {
        "total_visits": "Số bản ghi PatientVisit trong phạm vi; một người có thể có nhiều lượt.",
        "waiting_patients": "Lượt có trạng thái waiting/called; không gồm người chờ kết quả hay số người từ camera.",
        "median_waiting_time": "Trung vị bắt đầu phục vụ trừ vào hàng đợi trên các bước đã hoàn tất trong phạm vi.",
        "completion_rate": "Số lượt hoàn tất / tổng số lượt trong phạm vi × 100%."}
    kpis = []
    for key, title, value, series in (("total_visits", "Lượt khám hôm nay", len(visits), arrival_series),
        ("waiting_patients", "Đang chờ phục vụ", len(waiting), waiting_series),
        ("median_waiting_time", "Thời gian chờ trung vị", f"{med:g} phút", wait_series),
        ("completion_rate", "Hoàn tất quy trình", f"{completion:g}%", completion_series)):
        kpis.append({"id": key, "title": title, "value": value, "unit": "", "delta": "Dữ liệu demo",
            "trend": "neutral", "sparkline": series, "definition": definitions[key], "source": "visit_and_step_events",
            "measured_at": now.isoformat(), "data_mode": "synthetic"})
    total_times = [(v.completed_at - v.registered_at).total_seconds() / 60 for v in completed]
    return {"kpis": kpis, "freshness": now.strftime("%H:%M:%S"), "measured_at": now.isoformat(),
        "data_mode": "Dữ liệu mô phỏng", "source": "synthetic_operational_events", "scope": {"floor_id": floor_id, "department_id": department_id},
        "summary": {"total_visits": len(visits), "completed_visits": len(completed), "waiting_visits": len(waiting),
            "waiting_for_results": sum(v.status == "waiting_for_result" for v in visits),
            "in_service": sum(v.status == "in_service" for v in visits), "median_waiting_minutes": med,
            "median_total_minutes": round(median(total_times), 1) if total_times else 0,
            "completion_rate": completion, "active_alerts": db.query(Alert).filter(Alert.status == "active", Alert.room_id.in_(ids)).count()}}


@router.get("/queue-by-location")
def queue_by_location(floor_id: str | None = None, department_id: str | None = None, db: Session = Depends(get_db)):
    result = []
    for room in room_scope(db, floor_id, department_id):
        if room.id not in SERVICE_ROOMS:
            continue
        m = room_metrics(db, room)
        result.append({"name": room.name, "room_id": room.id, "floor_id": room.floor_id,
            "waiting": m["queue_length"], "present": m["people_present"], "being_served": m["being_served"],
            "waiting_minutes": m["median_waiting_time"], "is_congested": m["queue_length"] > 50,
            "data_mode": "synthetic", "measured_at": m["measured_at"]})
    return result


@router.get("/queue-history/{room_id}")
def history(room_id: str, db: Session = Depends(get_db)):
    return queue_history(db, room_id)


@router.get("/alerts")
def alerts(floor_id: str | None = None, department_id: str | None = None, db: Session = Depends(get_db)):
    ids = [r.id for r in room_scope(db, floor_id, department_id)]
    return [{"id": a.id, "room_id": a.room_id, "title": a.title, "description": a.description,
        "severity": a.severity, "status": a.status, "metric_name": a.metric_name, "metric_value": a.metric_value,
        "threshold": a.threshold, "created_at": a.created_at.strftime("%H:%M"), "data_mode": "synthetic"}
        for a in db.query(Alert).filter(Alert.status == "active", Alert.room_id.in_(ids)).order_by(Alert.created_at.desc()).all()]


@router.get("/events")
def events(limit: int = Query(15, ge=1, le=100), db: Session = Depends(get_db)):
    items = db.query(OperationalEvent).filter(OperationalEvent.event_type != "queue_snapshot").order_by(OperationalEvent.timestamp.desc()).limit(limit).all()
    return [{"id": e.id, "event_type": e.event_type, "room_id": e.room_id, "visit_id": e.visit_id,
        "description": e.description, "timestamp": e.timestamp.strftime("%H:%M:%S"), "data_mode": "synthetic"} for e in items]
