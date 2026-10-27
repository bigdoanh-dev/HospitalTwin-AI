from statistics import mean
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import roles
from app.models.models import Room, Scenario, ScenarioVersion, SimulationRun, User
from app.services.simulation import HospitalSimulation
from app.services.domain import uid, clock, audit, synchronized

router = APIRouter(dependencies=[Depends(roles("operator", "analyst", "director", "department_manager"))])


class RunSimulationRequest(BaseModel):
    name: str = Field(default="Mô phỏng công suất lấy mẫu", min_length=2, max_length=120)
    lab_counters: int = Field(default=7, ge=1, le=12)
    lab_staff: int | None = Field(default=None, ge=1, le=12)
    exam_counters: int | None = Field(default=None, ge=1, le=30)
    service_time: float = Field(default=8, ge=1, le=30)
    travel_minutes: float = Field(default=1, ge=0, le=20)
    ct_online: bool = True
    fast_track_returning: bool = False
    seed: int = Field(default=42, ge=0, le=1000000)
    repetitions: int = Field(default=3, ge=1, le=10)
    scenario_version_id: str | None = None


def compact(result):
    return {key: value for key, value in result.items() if key not in ("event_trace", "patient_outcomes")}


def comparison(baseline, proposed):
    return {"waiting_time_delta_minutes": round(proposed["median_waiting_time_minutes"] - baseline["median_waiting_time_minutes"], 2),
        "throughput_delta_patients": proposed["completed_visits"] - baseline["completed_visits"],
        "queue_reduction_percent": round(100 * (baseline["max_queue_length"] - proposed["max_queue_length"]) / max(1, baseline["max_queue_length"]), 1),
        "total_time_delta_minutes": round(proposed["median_total_time_minutes"] - baseline["median_total_time_minutes"], 2),
        "utilization_delta_percentage_points": round(100 * (proposed["resource_utilization"] - baseline["resource_utilization"]), 1)}


@router.post("/run")
@synchronized
def run_simulation(req: RunSimulationRequest, user: User = Depends(roles("operator", "analyst", "department_manager")), db: Session = Depends(get_db)):
    lab = db.get(Room, "ROOM-LAB-101")
    ct = db.get(Room, "ROOM-IMG-302")
    exam_capacity = sum(room.counters for room in db.query(Room).filter(Room.room_type == "consultation").all())
    baseline_config = {"lab_counters": lab.counters, "lab_staff": lab.active_staff,
        "exam_counters": exam_capacity, "ct_online": ct.status != "offline", "ct_downtime_duration": 0,
        "service_time": 8, "travel_minutes": 1}
    proposed_config = req.model_dump(exclude={"name", "seed", "repetitions", "scenario_version_id"}, exclude_none=True)
    proposed_config.setdefault("lab_staff", req.lab_counters)
    proposed_config.setdefault("exam_counters", exam_capacity)
    if req.scenario_version_id:
        version = db.get(ScenarioVersion, req.scenario_version_id)
        if not version:
            raise HTTPException(404, "Không tìm thấy phiên bản kịch bản")
        proposed_config = {**baseline_config, **version.changes}
    if proposed_config["lab_staff"] < proposed_config["lab_counters"]:
        raise HTTPException(422, "Thiếu nhân sự cho số bàn đề xuất")
    if proposed_config["lab_staff"] > lab.active_staff + 2 or proposed_config["lab_counters"] > lab.counters + 2:
        raise HTTPException(422, "Demo chỉ có hai nhân sự và hai bàn dự phòng")
    if not req.scenario_version_id:
        scenario = Scenario(id=uid("SCEN"), name=req.name, description="Kịch bản từ lần mô phỏng", created_by=user.id, created_at=clock(db))
        db.add(scenario)
        db.flush()
        version = ScenarioVersion(id=uid("VER"), scenario_id=scenario.id, version_number=1,
            changes=proposed_config, created_at=clock(db))
        db.add(version)
        db.flush()
    try:
        model = HospitalSimulation(seed=req.seed)
        baseline = model.run(baseline_config)
        proposed = model.run(proposed_config)
        repeats = [(baseline["median_waiting_time_minutes"], proposed["median_waiting_time_minutes"])]
        for offset in range(1, req.repetitions):
            replicate = HospitalSimulation(seed=req.seed + offset)
            repeats.append((replicate.run(baseline_config)["median_waiting_time_minutes"],
                replicate.run(proposed_config)["median_waiting_time_minutes"]))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    uncertainty = {"repetitions": req.repetitions, "kind": "replicate_range_not_confidence_interval",
        "baseline_wait_range": [min(x[0] for x in repeats), max(x[0] for x in repeats)],
        "proposed_wait_range": [min(x[1] for x in repeats), max(x[1] for x in repeats)],
        "mean_paired_delta": round(mean(x[1] - x[0] for x in repeats), 2)}
    snapshot_id = uid("SNAP")
    for result in (baseline, proposed):
        result["input_snapshot_id"] = snapshot_id
        result["snapshot_at"] = clock(db).isoformat()
        result["uncertainty"] = uncertainty
    record = SimulationRun(id=uid("SIM"), scenario_version_id=version.id, name=req.name,
        status="completed", seed=req.seed, duration_simulated_minutes=300,
        baseline_metrics=baseline, simulated_metrics=proposed, created_at=clock(db))
    db.add(record)
    audit(db, user, "RUN_SIMULATION", f"{record.id}; phiên bản {version.id}")
    db.commit()
    return {"simulation_id": record.id, "scenario_version_id": version.id,
        "baseline": compact(baseline), "proposed": compact(proposed), "comparison": comparison(baseline, proposed),
        "uncertainty": uncertainty, "data_mode": "simulation_prediction"}


@router.get("/baseline")
def latest(db: Session = Depends(get_db)):
    record = db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).first()
    if not record:
        return {"status": "none"}
    return {"id": record.id, "simulation_id": record.id, "name": record.name, "scenario_version_id": record.scenario_version_id,
        "baseline": compact(record.baseline_metrics), "proposed": compact(record.simulated_metrics),
        "comparison": comparison(record.baseline_metrics, record.simulated_metrics)}


@router.get("/{run_id}")
def detail(run_id: str, db: Session = Depends(get_db)):
    record = db.get(SimulationRun, run_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy mô phỏng")
    return {"id": record.id, "name": record.name, "scenario_version_id": record.scenario_version_id,
        "baseline": compact(record.baseline_metrics), "proposed": compact(record.simulated_metrics),
        "comparison": comparison(record.baseline_metrics, record.simulated_metrics), "status": record.status}


@router.get("/{run_id}/trace")
def trace(run_id: str, db: Session = Depends(get_db)):
    record = db.get(SimulationRun, run_id)
    if not record:
        raise HTTPException(404)
    return {"baseline": record.baseline_metrics["event_trace"], "proposed": record.simulated_metrics["event_trace"]}
