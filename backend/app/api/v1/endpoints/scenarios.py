from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import roles
from app.models.models import Room, Scenario, ScenarioVersion, User
from app.services.domain import uid, clock, audit, synchronized, SERVICE_ROOMS, ROOM_LABELS

router = APIRouter(dependencies=[Depends(roles("operator", "analyst", "director", "department_manager"))])


class ScenarioRequest(BaseModel):
    name: str = Field(default="Kịch bản mới", min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    config: dict = Field(default_factory=dict)
    nodes: list[dict] = Field(default_factory=list)
    edges: list[dict] = Field(default_factory=list)


def validate(req, db):
    config = req.config
    errors = []
    counters, staff = config.get("lab_counters", 7), config.get("lab_staff", config.get("lab_counters", 7))
    if not isinstance(counters, (int, float)) or not 1 <= counters <= 12:
        errors.append("Số bàn lấy mẫu cần nằm trong 1–12")
    if not isinstance(staff, (int, float)) or not isinstance(counters, (int, float)) or staff < counters:
        errors.append("Mỗi bàn cần ít nhất một nhân viên")
    service = config.get("service_time", 8)
    if not isinstance(service, (int, float)) or not 1 <= service <= 30:
        errors.append("Thời gian phục vụ phải trong 1–30 phút")
    ids = {node.get("id") for node in req.nodes}
    for node in req.nodes:
        room_id = node.get("room_id") or node.get("data", {}).get("room_id")
        if not room_id or not db.get(Room, room_id):
            errors.append(f"Bước {node.get('id')} chưa có địa điểm hợp lệ")
    for edge in req.edges:
        if edge.get("source") not in ids or edge.get("target") not in ids:
            errors.append("Đường nối tham chiếu bước không tồn tại")
    if req.nodes and len(ids) != len(req.nodes):
        errors.append("Mã bước không được trùng")
    if req.nodes and req.edges and not any("không tồn tại" in error for error in errors):
        graph = {node: [] for node in ids}
        reverse = {node: [] for node in ids}
        for edge in req.edges:
            graph[edge["source"]].append(edge["target"])
            reverse[edge["target"]].append(edge["source"])
        exits = [node for node, targets in graph.items() if not targets]
        reachable, stack = set(exits), list(exits)
        while stack:
            node = stack.pop()
            for previous in reverse[node]:
                if previous not in reachable:
                    reachable.add(previous)
                    stack.append(previous)
        if reachable != ids:
            errors.append("Có vòng lặp hoặc nhánh không có đường kết thúc")
    return errors


def public(record):
    versions = sorted(record.versions, key=lambda version: version.version_number)
    return {"id": record.id, "name": record.name, "description": record.description,
        "versions": [{"id": v.id, "version_number": v.version_number, "config": v.changes,
            "created_at": v.created_at.isoformat()} for v in versions],
        "latest_version_id": versions[-1].id if versions else None,
        "config": versions[-1].changes if versions else {}}


@router.get("")
def list_scenarios(db: Session = Depends(get_db)):
    return [public(item) for item in db.query(Scenario).order_by(Scenario.created_at.desc()).all()]


@router.get("/template")
def template(db: Session = Depends(get_db)):
    rooms = SERVICE_ROOMS[:-1]
    nodes = [{"id": room, "room_id": room, "data": {"label": ROOM_LABELS[room], "room_id": room},
        "position": {"x": n * 210, "y": 100 if n % 2 else 0}} for n, room in enumerate(rooms)]
    edges = [{"id": f"E-{n}", "source": a, "target": b, "animated": True} for n, (a, b) in enumerate(zip(rooms, rooms[1:]))]
    return {"nodes": nodes, "edges": edges, "config": {"lab_counters": 7, "lab_staff": 7, "service_time": 8}}


@router.post("/validate")
def validate_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    errors = validate(req, db)
    return {"valid": not errors, "errors": errors, "warnings": ["Đây là mô hình nghiên cứu, chưa được hiệu chỉnh theo bệnh viện thực."]}


@router.post("")
@synchronized
def create(req: ScenarioRequest, user: User = Depends(roles("operator", "analyst", "department_manager")), db: Session = Depends(get_db)):
    errors = validate(req, db)
    if errors:
        raise HTTPException(422, errors)
    item = Scenario(id=uid("SCEN"), name=req.name, description=req.description, created_by=user.id, created_at=clock(db))
    db.add(item)
    db.flush()
    version = ScenarioVersion(id=uid("VER"), scenario_id=item.id, version_number=1,
        changes={**req.config, "nodes": req.nodes, "edges": req.edges}, created_at=clock(db))
    db.add(version)
    audit(db, user, "CREATE_SCENARIO", item.id)
    db.commit()
    return public(item)


@router.post("/{scenario_id}/versions")
@synchronized
def new_version(scenario_id: str, req: ScenarioRequest, user: User = Depends(roles("operator", "analyst", "department_manager")), db: Session = Depends(get_db)):
    item = db.get(Scenario, scenario_id)
    if not item:
        raise HTTPException(404)
    errors = validate(req, db)
    if errors:
        raise HTTPException(422, errors)
    version = ScenarioVersion(id=uid("VER"), scenario_id=item.id,
        version_number=max((v.version_number for v in item.versions), default=0) + 1,
        changes={**req.config, "nodes": req.nodes, "edges": req.edges}, created_at=clock(db))
    db.add(version)
    audit(db, user, "VERSION_SCENARIO", f"{item.id}: {version.id}")
    db.commit()
    db.refresh(item)
    return public(item)
