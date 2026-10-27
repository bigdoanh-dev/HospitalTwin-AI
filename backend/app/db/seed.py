"""Deterministic, connected fictional data. Metrics are calculated from executions."""
import random
from datetime import datetime, timedelta
from app.db.session import Base, engine, SessionLocal
from app.db.fixtures import ROOMS_DATA, FLOORS_DATA, SP_DATA, CAM_DATA
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.models import (User, Building, Floor, Room, ServicePoint, Camera, Patient,
    PatientVisit, StepExecution, DemoState, Scenario, ScenarioVersion, SimulationRun,
    Intervention, ExecutionTask, ServiceOrder)
from app.services.domain import refresh_metrics, ROOM_LABELS
from app.services.simulation import HospitalSimulation


def seed_database():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(User).first():
            return
        rng = random.Random(settings.RANDOM_SEED)
        now = datetime(2026, 10, 27, 10, 24, 36)
        db.add(DemoState(id="clock", data={"now": now.isoformat(), "running": False, "speed": 1}))
        role_names = {"admin": "Quản trị hệ thống", "director": "Giám đốc · người phê duyệt",
            "operator": "Điều phối vận hành", "analyst": "Chuyên viên quy trình",
            "department_manager": "Trưởng bộ phận", "receptionist": "Nhân viên tiếp đón",
            "doctor": "Bác sĩ khám", "lab_staff": "Kỹ thuật viên xét nghiệm",
            "cashier": "Nhân viên thu ngân", "pharmacy_staff": "Nhân viên cấp phát thuốc",
            "maintenance": "Nhân viên kỹ thuật", "camera_operator": "Nhân viên giám sát camera",
            "patient": "Người bệnh trình diễn"}
        password_hash = get_password_hash(settings.DEMO_PASSWORD)
        for role, name in role_names.items():
            db.add(User(id=f"USR-{role.upper()}", username=role, email=f"{role}@demo.example",
                full_name=name, hashed_password=password_hash, role=role,
                patient_id="PAT-0269" if role == "patient" else None, is_active=True))
        db.add(Building(id="BLD-A", name="Tòa nhà A · Khám ngoại trú giả định", code="A"))
        for fid, bid, name, level, elevation in FLOORS_DATA:
            db.add(Floor(id=fid, building_id=bid, name=name, level=level, elevation=elevation))
        for rid, fid, did, name, typ, x, y, z, width, length, capacity, counters, staff, _, __, ___ in ROOMS_DATA:
            db.add(Room(id=rid, floor_id=fid, department_id=did, name=name, room_type=typ,
                x=x, y=y, z=z, width=width, length=length, capacity=capacity,
                counters=counters, active_staff=staff, current_queue_length=0,
                current_waiting_time=0, status="normal"))
        db.add(Room(id="ROOM-INS-101", floor_id="FL-1F", department_id="KHOA-KHAM",
            name="Xác minh BHYT", room_type="insurance", x=-20, y=0, z=-15,
            width=10, length=7, capacity=25, counters=2, active_staff=2,
            current_queue_length=0, current_waiting_time=0, status="normal"))
        db.flush()
        for sid, rid, name, typ in SP_DATA:
            db.add(ServicePoint(id=sid, room_id=rid, name=name, service_type=typ, active=True))
        db.add(ServicePoint(id="SP-INS-01", room_id="ROOM-INS-101", name="Quầy BHYT", service_type="insurance", active=True))
        for cid, rid, name, count, confidence in CAM_DATA:
            db.add(Camera(id=cid, room_id=rid, name=name, source_type="synthetic_simulation",
                people_count=count, confidence=confidence, is_online=True, last_update=now))
        names = ["An", "Bình", "Chi", "Dũng", "Giang", "Hương", "Khánh", "Linh", "Minh", "Ngọc", "Phúc", "Trang"]
        active_rooms = (["ROOM-REC-101"] * 8 + ["ROOM-INS-101"] * 4 + ["ROOM-EXAM-101"] * 10
            + ["ROOM-LAB-101"] * 68 + ["ROOM-RES-101"] * 6 + ["ROOM-PAY-101"] * 5
            + ["ROOM-PHAR-101"] * 4 + ["ROOM-IMG-302"] * 3)
        durations = {"ROOM-REC-101": (2, 8, 3), "ROOM-INS-101": (1, 5, 2),
            "ROOM-EXAM-101": (8, 22, 8), "ROOM-LAB-101": (30, 60, 8),
            "ROOM-RES-101": (0, 0, 20), "ROOM-PAY-101": (2, 8, 3), "ROOM-PHAR-101": (2, 10, 4)}
        for i in range(1, 361):
            pid, vid = f"PAT-{i:04d}", f"VISIT-{i:04d}"
            patient = Patient(id=pid, patient_code=f"BN-DEMO-{i:04d}",
                full_name=f"Người bệnh {names[i % len(names)]} {i:03d} · giả lập", gender="Nữ" if i % 2 else "Nam",
                dob=f"{1970 + i % 35}-01-01")
            db.add(patient)
            pay = ("bhyt", "service", "hybrid")[i % 3]
            if i <= 240:
                path = ["ROOM-REC-101"] + (["ROOM-INS-101"] if pay != "service" else []) + ["ROOM-EXAM-101"]
                if i % 5:
                    path += ["ROOM-LAB-101", "ROOM-RES-101", "ROOM-EXAM-101"]
                path += ["ROOM-PAY-101", "ROOM-PHAR-101"]
                timings = []
                for rid in path:
                    low, high, service = durations[rid]
                    timings.append((rng.uniform(low, high), rng.uniform(service * .8, service * 1.2)))
                end = now - timedelta(minutes=rng.uniform(1, 100))
                cursor = end - timedelta(minutes=sum(w + s + 1 for w, s in timings))
                visit = PatientVisit(id=vid, patient_id=pid, visit_code=f"KB-DEMO-{i:04d}", ticket_number=f"A{i:03d}",
                    payment_type=pay, current_room_id="ROOM-PHAR-101", status="completed",
                    registered_at=cursor, started_at=cursor + timedelta(minutes=timings[0][0]), completed_at=end,
                    total_waiting_time=sum(w for w, _ in timings), total_service_time=sum(s for _, s in timings))
                db.add(visit)
                for n, (rid, (wait, service)) in enumerate(zip(path, timings)):
                    start = cursor + timedelta(minutes=wait)
                    finish = start + timedelta(minutes=service)
                    db.add(StepExecution(id=f"STEP-{i:04d}-{n}", visit_id=vid, room_id=rid,
                        step_name="Xử lý mẫu" if rid == "ROOM-RES-101" else ROOM_LABELS[rid], status="completed",
                        queued_at=cursor, started_at=start, completed_at=finish,
                        waiting_duration_minutes=wait, service_duration_minutes=service))
                    cursor = finish + timedelta(minutes=1)
            else:
                status = "waiting" if i <= 348 else "in_service"
                serving_rooms = ["ROOM-LAB-101"] * 4 + ["ROOM-EXAM-101"] + ["ROOM-REC-101"] * 2 + ["ROOM-INS-101"] + ["ROOM-PAY-101"] * 2 + ["ROOM-PHAR-101"] * 2
                rid = active_rooms[i - 241] if i <= 348 else serving_rooms[i - 349]
                if rid == "ROOM-RES-101":
                    status = "waiting_for_result"
                queued = now - timedelta(minutes=rng.uniform(5, 70))
                visit = PatientVisit(id=vid, patient_id=pid, visit_code=f"KB-DEMO-{i:04d}", ticket_number=f"A{i:03d}",
                    payment_type=pay, current_room_id=rid, status=status, registered_at=queued - timedelta(minutes=20),
                    total_waiting_time=0, total_service_time=0)
                step_id = f"STEP-{i:04d}-active"
                visit.current_step_id = step_id
                db.add(visit)
                started = now - timedelta(minutes=2) if status == "in_service" else None
                db.add(StepExecution(id=step_id, visit_id=vid, room_id=rid,
                    step_name=ROOM_LABELS[rid], status=status, queued_at=queued,
                    started_at=started, waiting_duration_minutes=(started - queued).total_seconds() / 60 if started else 0,
                    service_duration_minutes=0))
                if rid in ("ROOM-LAB-101", "ROOM-RES-101"):
                    db.add(ServiceOrder(id=f"ORDER-{i:04d}", visit_id=vid, service_type="laboratory",
                        description="Xét nghiệm demo", status="processing" if rid == "ROOM-RES-101" else "ordered",
                        created_at=queued - timedelta(minutes=3), updated_at=queued))
        db.flush()
        db.add(Scenario(id="SCEN-001", name="Bổ sung công suất lấy mẫu", description="Kịch bản nháp, chưa thay đổi vận hành", created_by="USR-ANALYST"))
        db.flush()
        db.add(ScenarioVersion(id="VER-001", scenario_id="SCEN-001", version_number=1,
            changes={"lab_counters": 7, "lab_staff": 7, "service_time": 8, "exam_counters": 14,
                "ct_online": True, "ct_downtime_duration": 0, "target_room_id": "ROOM-LAB-101"}))
        baseline = HospitalSimulation(seed=42).run({"lab_counters": 6, "exam_counters": 10, "ct_downtime_duration": 0})
        proposed = HospitalSimulation(seed=42).run({"lab_counters": 7, "exam_counters": 10, "ct_downtime_duration": 0})
        db.add(SimulationRun(id="SIM-001", scenario_version_id="VER-001", name="Kết quả mô phỏng mẫu · seed 42",
            status="completed", seed=42, duration_simulated_minutes=300,
            baseline_metrics=baseline, simulated_metrics=proposed))
        db.add(Intervention(id="INTV-001", title="Mở thêm một bàn lấy mẫu", description="Phương án trình diễn chờ phê duyệt",
            target_room_id="ROOM-LAB-101", status="pending_approval", proposed_by="USR-OPERATOR", simulation_run_id="SIM-001",
            resource_delta="+1 bàn, +1 nhân viên dự phòng", expected_impact="Xem kết quả tính toán trong mô phỏng"))
        db.flush()
        for n, title in enumerate(("Xác nhận bàn và vật tư", "Bố trí nhân viên dự phòng"), 1):
            db.add(ExecutionTask(id=f"TSK-00{n}", intervention_id="INTV-001", title=title, assigned_to="department_manager", status="pending"))
        refresh_metrics(db)
        db.commit()


if __name__ == "__main__":
    seed_database()
    print("Đã khởi tạo dữ liệu bệnh viện giả lập có liên kết.")
