import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    OPERATOR = "operator"
    ANALYST = "analyst"
    DEPARTMENT_MANAGER = "department_manager"
    RECEPTIONIST = "receptionist"
    DOCTOR = "doctor"
    LAB_STAFF = "lab_staff"
    MAINTENANCE = "maintenance"
    CAMERA_OPERATOR = "camera_operator"
    PATIENT = "patient"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRoleEnum.OPERATOR.value, nullable=False)
    department_id = Column(String, nullable=True)
    patient_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

class Building(Base):
    __tablename__ = "buildings"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")

class Floor(Base):
    __tablename__ = "floors"
    id = Column(String, primary_key=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=False)
    name = Column(String, nullable=False) # e.g. "Tầng 1", "Tầng 2", "Tầng 3", "Tầng hầm B1"
    level = Column(Integer, nullable=False) # -1, 1, 2, 3
    elevation = Column(Float, default=0.0)
    building = relationship("Building", back_populates="floors")
    rooms = relationship("Room", back_populates="floor", cascade="all, delete-orphan")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, index=True) # e.g. "ROOM-LAB-101", "ROOM-REC-101"
    floor_id = Column(String, ForeignKey("floors.id"), nullable=False)
    department_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    room_type = Column(String, nullable=False) # registration, consultation, laboratory, pharmacy, payment, waiting, etc.
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)
    z = Column(Float, default=0.0)
    width = Column(Float, default=10.0)
    length = Column(Float, default=10.0)
    capacity = Column(Integer, default=30)
    counters = Column(Integer, default=2)
    active_staff = Column(Integer, default=2)
    current_queue_length = Column(Integer, default=0)
    current_waiting_time = Column(Float, default=15.0) # minutes
    status = Column(String, default="normal") # normal, busy, congested, offline
    floor = relationship("Floor", back_populates="rooms")
    service_points = relationship("ServicePoint", back_populates="room")
    cameras = relationship("Camera", back_populates="room")

class ServicePoint(Base):
    __tablename__ = "service_points"
    id = Column(String, primary_key=True) # SP-LAB-01, SP-REC-01
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    name = Column(String, nullable=False)
    service_type = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    current_staff_id = Column(String, nullable=True)
    room = relationship("Room", back_populates="service_points")

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(String, primary_key=True) # CAM-LAB-01, CAM-REC-01
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    name = Column(String, nullable=False)
    source_type = Column(String, default="synthetic_simulation") # synthetic_simulation, demo_video, rtsp
    stream_url = Column(String, nullable=True)
    is_online = Column(Boolean, default=True)
    people_count = Column(Integer, default=12)
    confidence = Column(Float, default=0.92)
    last_update = Column(DateTime, default=utcnow)
    room = relationship("Room", back_populates="cameras")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, index=True)
    patient_code = Column(String, unique=True, index=True, nullable=False) # BN-2025-0012
    full_name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    insurance_number = Column(String, nullable=True)

class PatientVisit(Base):
    __tablename__ = "patient_visits"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    visit_code = Column(String, unique=True, index=True, nullable=False) # KB-2025-0101
    ticket_number = Column(String, nullable=False) # A042
    payment_type = Column(String, default="bhyt") # bhyt, service, hybrid
    chief_complaint = Column(String, nullable=True)
    current_step_id = Column(String, nullable=True)
    current_room_id = Column(String, nullable=True)
    status = Column(String, default="waiting") # registered, waiting, in_service, completed, cancelled
    registered_at = Column(DateTime, default=utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    total_waiting_time = Column(Float, default=0.0) # minutes
    total_service_time = Column(Float, default=0.0) # minutes
    patient = relationship("Patient")
    step_executions = relationship("StepExecution", back_populates="visit", cascade="all, delete-orphan")

class StepExecution(Base):
    __tablename__ = "step_executions"
    id = Column(String, primary_key=True)
    visit_id = Column(String, ForeignKey("patient_visits.id"), nullable=False)
    step_name = Column(String, nullable=False) # Tiếp đón, Khám chuyên khoa, Lấy mẫu xét nghiệm, Trả kết quả, Thanh toán, Lĩnh thuốc
    room_id = Column(String, nullable=False)
    service_point_id = Column(String, nullable=True)
    status = Column(String, default="completed") # pending, waiting, in_progress, completed, skipped
    queued_at = Column(DateTime, default=utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    waiting_duration_minutes = Column(Float, default=0.0)
    service_duration_minutes = Column(Float, default=0.0)
    visit = relationship("PatientVisit", back_populates="step_executions")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, default="medium") # critical (red), warning (yellow), info (blue)
    status = Column(String, default="active") # active, acknowledged, resolved
    metric_name = Column(String, nullable=True)
    metric_value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class OperationalEvent(Base):
    __tablename__ = "operational_events"
    id = Column(String, primary_key=True)
    event_type = Column(String, nullable=False) # patient_registered, queue_entered, patient_called, service_started, service_completed, congestion_alert, etc.
    room_id = Column(String, nullable=True)
    visit_id = Column(String, nullable=True)
    description = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=utcnow)

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    versions = relationship("ScenarioVersion", back_populates="scenario", cascade="all, delete-orphan")

class ScenarioVersion(Base):
    __tablename__ = "scenario_versions"
    id = Column(String, primary_key=True)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    version_number = Column(Integer, default=1)
    changes = Column(JSON, nullable=False) # e.g. [{"action": "increase_counter", "room_id": "ROOM-LAB-101", "delta": 1}]
    created_at = Column(DateTime, default=utcnow)
    scenario = relationship("Scenario", back_populates="versions")

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    id = Column(String, primary_key=True)
    scenario_version_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    status = Column(String, default="completed") # queued, running, completed, failed
    seed = Column(Integer, default=42)
    duration_simulated_minutes = Column(Float, default=480.0)
    baseline_metrics = Column(JSON, nullable=True)
    simulated_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    target_room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    status = Column(String, default="pending_approval") # draft, pending_approval, approved, rejected, executing, completed, evaluated
    proposed_by = Column(String, nullable=False)
    approved_by = Column(String, nullable=True)
    simulation_run_id = Column(String, nullable=True)
    resource_delta = Column(String, nullable=True) # e.g. "+1 bàn lấy mẫu, +1 điều dưỡng"
    expected_impact = Column(String, nullable=True) # e.g. "Thời gian chờ giảm từ 45p xuống 26p"
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow)
    tasks = relationship("ExecutionTask", back_populates="intervention", cascade="all, delete-orphan")

class ExecutionTask(Base):
    __tablename__ = "execution_tasks"
    id = Column(String, primary_key=True)
    intervention_id = Column(String, ForeignKey("interventions.id"), nullable=False)
    title = Column(String, nullable=False)
    assigned_to = Column(String, nullable=False)
    status = Column(String, default="pending") # pending, in_progress, completed
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)
    intervention = relationship("Intervention", back_populates="tasks")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False) # LOGIN, APPROVE_INTERVENTION, TRIGGER_CONGESTION, etc.
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    refresh_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)

class DemoState(Base):
    __tablename__ = "demo_state"
    id = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)

class ServiceOrder(Base):
    __tablename__ = "service_orders"
    id = Column(String, primary_key=True)
    visit_id = Column(String, ForeignKey("patient_visits.id"), nullable=False)
    service_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="ordered", nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
