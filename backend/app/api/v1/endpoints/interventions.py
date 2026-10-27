from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import roles
from app.models.models import Intervention, ExecutionTask, SimulationRun, Room, DemoState, User, AuditLog
from app.services.domain import uid, clock, audit, event, refresh_metrics, room_metrics, synchronized

router = APIRouter(dependencies=[Depends(roles("director", "operator", "analyst", "department_manager", "lab_staff", "maintenance"))])


class CreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="Phương án vận hành trình diễn", max_length=1000)
    target_room_id: str = "ROOM-LAB-101"
    simulation_run_id: str | None = None
    resource_delta: str = ""
    expected_impact: str = ""
    proposed_by: str | None = None


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected", "request_changes"]
    reason: str | None = Field(default=None, max_length=1000)


class TaskRequest(BaseModel):
    task_id: str
    status: Literal["in_progress", "completed"]


def get_item(db, item_id):
    item = db.get(Intervention, item_id)
    if not item:
        raise HTTPException(404, "Không tìm thấy phương án")
    return item


def as_public(db, item):
    sim = db.get(SimulationRun, item.simulation_run_id) if item.simulation_run_id else None
    evaluation = db.get(DemoState, f"evaluation:{item.id}")
    return {"id": item.id, "title": item.title, "description": item.description,
        "target_room_id": item.target_room_id, "status": item.status, "proposed_by": item.proposed_by,
        "approved_by": item.approved_by, "resource_delta": item.resource_delta, "expected_impact": item.expected_impact,
        "created_at": item.created_at.strftime("%H:%M"), "simulation_run_id": item.simulation_run_id,
        "scenario_version_id": sim.scenario_version_id if sim else None,
        "prediction": {"waiting_minutes": sim.simulated_metrics["median_waiting_time_minutes"],
            "throughput": sim.simulated_metrics["completed_visits"], "queue": sim.simulated_metrics["max_queue_length"]} if sim else None,
        "tasks": [{"id": task.id, "title": task.title, "assigned_to": task.assigned_to, "status": task.status} for task in item.tasks],
        "evaluation": evaluation.data if evaluation else None,
        "audit_history": [{"action": row.action, "actor": row.user_role, "timestamp": row.timestamp.isoformat(), "details": row.details}
            for row in db.query(AuditLog).filter(AuditLog.details.contains(item.id)).order_by(AuditLog.timestamp).all()],
        "data_mode": "synthetic"}


@router.get("")
def list_items(db: Session = Depends(get_db)):
    return [as_public(db, item) for item in db.query(Intervention).order_by(Intervention.created_at.desc()).all()]


@router.post("")
@synchronized
def create(req: CreateRequest, user: User = Depends(roles("operator", "analyst", "department_manager")), db: Session = Depends(get_db)):
    sim = db.get(SimulationRun, req.simulation_run_id) if req.simulation_run_id else db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).first()
    if not sim or sim.status != "completed":
        raise HTTPException(422, "Cần kết quả mô phỏng đã hoàn tất")
    if req.target_room_id != "ROOM-LAB-101":
        raise HTTPException(422, "Demo phê duyệt hiện hỗ trợ phương án công suất lấy mẫu")
    proposed = sim.simulated_metrics
    item = Intervention(id=uid("INTV"), title=req.title, description=req.description,
        target_room_id=req.target_room_id, simulation_run_id=sim.id, proposed_by=user.id,
        status="pending_approval", created_at=clock(db), updated_at=clock(db),
        resource_delta=f"{proposed['assumptions']['lab_counters']} bàn / {proposed['assumptions']['lab_staff']} nhân viên sau điều chỉnh",
        expected_impact=f"Dự báo chờ lấy mẫu {proposed['median_waiting_time_minutes']:g} phút; {proposed['completed_visits']} lượt hoàn tất trong 300 phút")
    db.add(item)
    db.flush()
    for title in ("Xác nhận vị trí và vật tư", "Xác nhận nhân sự theo cấu hình đã duyệt"):
        db.add(ExecutionTask(id=uid("TASK"), intervention_id=item.id, title=title, assigned_to="department_manager", status="pending", created_at=clock(db)))
    audit(db, user, "PROPOSE_INTERVENTION", f"{item.id}; mô phỏng {sim.id}; phiên bản {sim.scenario_version_id}")
    db.commit()
    return {"id": item.id, "message": "Đã gửi phương án kèm phiên bản mô phỏng để phê duyệt"}


@router.post("/{item_id}/decision")
@synchronized
def decision(item_id: str, req: DecisionRequest, user: User = Depends(roles("director")), db: Session = Depends(get_db)):
    item = get_item(db, item_id)
    if item.status != "pending_approval":
        raise HTTPException(409, "Phương án không ở trạng thái chờ phê duyệt")
    if item.proposed_by == user.id:
        raise HTTPException(403, "Người đề xuất không được tự phê duyệt")
    if req.decision != "approved" and not (req.reason or "").strip():
        raise HTTPException(422, "Cần ghi lý do từ chối hoặc yêu cầu sửa")
    item.status = "draft" if req.decision == "request_changes" else req.decision
    item.approved_by, item.updated_at = user.id, clock(db)
    audit(db, user, req.decision.upper(), f"{item.id}; mô phỏng {item.simulation_run_id}; {req.reason or 'Đã xem xét'}")
    db.commit()
    return {"message": "Đã ghi nhận quyết định", "status": item.status}


@router.post("/tasks/update")
@synchronized
def update_task(req: TaskRequest, user: User = Depends(roles("operator", "department_manager", "lab_staff", "maintenance")), db: Session = Depends(get_db)):
    task = db.get(ExecutionTask, req.task_id)
    if not task:
        raise HTTPException(404, "Không tìm thấy nhiệm vụ")
    item = task.intervention
    if item.status not in ("approved", "in_progress"):
        raise HTTPException(409, "Chỉ triển khai sau khi phương án được phê duyệt")
    if task.status == "completed":
        raise HTTPException(409, "Nhiệm vụ đã hoàn tất; không thể sửa ngược trạng thái")
    task.status = req.status
    task.completed_at = clock(db) if req.status == "completed" else None
    item.status = "in_progress"
    db.flush()
    if all(child.status == "completed" for child in item.tasks):
        sim = db.get(SimulationRun, item.simulation_run_id)
        room = db.get(Room, item.target_room_id)
        baseline, proposed = sim.baseline_metrics["assumptions"], sim.simulated_metrics["assumptions"]
        if room.counters != baseline["lab_counters"]:
            raise HTTPException(409, "Hiện trạng nguồn lực đã thay đổi; cần mô phỏng và phê duyệt lại")
        before = room_metrics(db, room)
        db.add(DemoState(id=f"baseline:{item.id}", data={**before, "counters": room.counters, "staff": room.active_staff}))
        room.counters, room.active_staff = proposed["lab_counters"], proposed["lab_staff"]
        item.status = "completed"
        event(db, "intervention_executed", f"Đã áp dụng {item.id} trong môi trường mô phỏng", room.id,
            payload={"counters": room.counters, "staff": room.active_staff})
    audit(db, user, "EXECUTION_TASK", f"{item.id}: {task.id} -> {req.status}")
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã cập nhật thực hiện trong môi trường demo", "status": task.status, "intervention_status": item.status}


@router.post("/{item_id}/evaluate")
@synchronized
def evaluate(item_id: str, user: User = Depends(roles("operator", "analyst", "department_manager", "director")), db: Session = Depends(get_db)):
    item = get_item(db, item_id)
    if item.status not in ("completed", "evaluated"):
        raise HTTPException(409, "Cần hoàn tất triển khai trước khi đánh giá")
    before = db.get(DemoState, f"baseline:{item.id}")
    sim = db.get(SimulationRun, item.simulation_run_id)
    observed = room_metrics(db, db.get(Room, item.target_room_id))
    data = {"baseline": before.data if before else None,
        "predicted": {"waiting_minutes": sim.simulated_metrics["median_waiting_time_minutes"], "queue": sim.simulated_metrics["max_queue_length"]},
        "observed": observed, "evaluated_at": clock(db).isoformat(),
        "limitation": "Quan sát là dữ liệu demo; số đo hiện tại khác thống kê cả chân trời mô phỏng, chưa phải ước lượng tác động nhân quả."}
    record = db.get(DemoState, f"evaluation:{item.id}")
    if record:
        record.data = data
    else:
        db.add(DemoState(id=f"evaluation:{item.id}", data=data))
    item.status = "evaluated"
    audit(db, user, "EVALUATE_INTERVENTION", item.id)
    db.commit()
    return data


@router.post("/{item_id}/rollback")
@synchronized
def rollback(item_id: str, user: User = Depends(roles("operator", "department_manager")), db: Session = Depends(get_db)):
    item = get_item(db, item_id)
    before = db.get(DemoState, f"baseline:{item.id}")
    if item.status not in ("completed", "evaluated") or not before:
        raise HTTPException(409, "Chưa có cấu hình triển khai để khôi phục")
    room = db.get(Room, item.target_room_id)
    if room_metrics(db, room)["being_served"] > before.data["counters"]:
        raise HTTPException(409, "Cần chờ số lượt đang phục vụ giảm trước khi thu hẹp công suất")
    room.counters, room.active_staff = before.data["counters"], before.data["staff"]
    item.status = "rolled_back"
    audit(db, user, "ROLLBACK_INTERVENTION", item.id)
    refresh_metrics(db)
    db.commit()
    return {"message": "Đã khôi phục cấu hình trước can thiệp", "status": item.status}
