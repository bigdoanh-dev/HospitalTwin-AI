"""Small reproducible discrete-event model; predictions are explicitly synthetic."""
import random
from dataclasses import dataclass
from statistics import mean, median
from typing import Any
import simpy


@dataclass(frozen=True)
class PatientProfile:
    pid: int
    arrival_time: float
    reg_dur: float
    exam_dur: float
    needs_lab: bool
    lab_dur: float
    lab_proc_dur: float
    exam_return_dur: float
    needs_ct: bool
    ct_dur: float
    pharm_dur: float


class HospitalSimulation:
    MODEL_VERSION = "outpatient-des-2.0"

    def __init__(self, seed=42, duration_minutes=300.0, total_cohort_size=360):
        if duration_minutes <= 0 or total_cohort_size <= 0:
            raise ValueError("Horizon and cohort size must be positive")
        self.seed, self.duration_minutes, self.total_cohort_size = seed, duration_minutes, total_cohort_size
        rng, arrival = random.Random(seed), 0.0
        self.cohort = []
        for pid in range(1, total_cohort_size + 1):
            interval = duration_minutes / total_cohort_size * (.52 if 30 <= arrival <= 180 else 1.6)
            arrival += rng.expovariate(1 / interval)
            self.cohort.append(PatientProfile(pid, arrival, rng.uniform(1.2, 2.4), rng.uniform(4.5, 8),
                rng.random() < .78, rng.uniform(6.5, 9.5), rng.uniform(15, 25), rng.uniform(2, 4),
                rng.random() < .1, rng.uniform(16, 24), rng.uniform(2, 4)))

    def run(self, scenario_config: dict[str, Any] | None = None):
        config = scenario_config or {}
        lab_count, exam_count = int(config.get("lab_counters", 6)), int(config.get("exam_counters", 14))
        if not 1 <= lab_count <= 12 or not 1 <= exam_count <= 30:
            raise ValueError("Counter capacity is outside model limits")
        lab_staff = int(config.get("lab_staff", lab_count))
        if lab_staff < lab_count:
            raise ValueError("Cần ít nhất một nhân viên cho mỗi bàn lấy mẫu")
        service_time = float(config.get("service_time", 8))
        travel = float(config.get("travel_minutes", 1))
        if not 1 <= service_time <= 30 or not 0 <= travel <= 20:
            raise ValueError("Invalid service or travel duration")
        env = simpy.Environment()
        resources = {"registration": simpy.PriorityResource(env, capacity=6),
            "consultation": simpy.PriorityResource(env, capacity=exam_count),
            "laboratory": simpy.PriorityResource(env, capacity=lab_count),
            "ct": simpy.PriorityResource(env, capacity=1),
            "payment": simpy.PriorityResource(env, capacity=4),
            "pharmacy": simpy.PriorityResource(env, capacity=6)}
        trace, samples, outcomes, busy_lab = [], [], [], []
        horizon = self.duration_minutes

        def record(pid, kind, stage):
            trace.append({"patient_id": pid, "time_minute": round(env.now, 3), "event": kind, "stage": stage})

        def maintenance():
            offline = not config.get("ct_online", True)
            downtime = horizon if offline else float(config.get("ct_downtime_duration", 0))
            start = 0 if offline else float(config.get("ct_downtime_start", 60))
            if downtime > 0:
                yield env.timeout(max(0, start))
                with resources["ct"].request(priority=-100) as request:
                    yield request
                    yield env.timeout(downtime)

        def patient(p):
            yield env.timeout(p.arrival_time)
            waiting, service, walking = 0.0, 0.0, 0.0
            record(p.pid, "arrived", "entry")

            def step(stage, duration, priority=1):
                nonlocal waiting, service
                queued = env.now
                record(p.pid, "queue_entered", stage)
                with resources[stage].request(priority=priority) as request:
                    yield request
                    waiting += env.now - queued
                    record(p.pid, "service_started", stage)
                    if stage == "laboratory":
                        busy_lab.append((env.now, env.now + duration))
                    yield env.timeout(duration)
                    service += duration
                    record(p.pid, "service_completed", stage)

            def move():
                nonlocal walking
                walking += travel
                yield env.timeout(travel)

            yield env.process(step("registration", p.reg_dur))
            yield env.process(move())
            yield env.process(step("consultation", p.exam_dur))
            if p.needs_lab:
                yield env.process(move())
                yield env.process(step("laboratory", p.lab_dur * service_time / 8))
                record(p.pid, "processing_started", "lab_result")
                yield env.timeout(p.lab_proc_dur)
                record(p.pid, "result_ready", "lab_result")
                yield env.process(move())
                priority = 0 if config.get("fast_track_returning", False) else 1
                yield env.process(step("consultation", p.exam_return_dur, priority))
            if p.needs_ct:
                yield env.process(move())
                yield env.process(step("ct", p.ct_dur))
            yield env.process(move())
            yield env.process(step("payment", 2))
            yield env.process(move())
            yield env.process(step("pharmacy", p.pharm_dur))
            outcomes.append({"patient_id": p.pid, "arrival": p.arrival_time, "completed_at": env.now,
                "duration_minutes": env.now - p.arrival_time, "waiting_minutes": waiting,
                "service_minutes": service, "travel_minutes": walking,
                "processing_minutes": p.lab_proc_dur if p.needs_lab else 0})
            record(p.pid, "visit_completed", "exit")

        def monitor():
            while True:
                samples.append({"time_minute": round(env.now, 1),
                    "lab_queue": len(resources["laboratory"].queue),
                    "ct_queue": sum(r.priority >= 0 for r in resources["ct"].queue),
                    "exam_queue": len(resources["consultation"].queue),
                    "reception_queue": len(resources["registration"].queue)})
                yield env.timeout(15)

        env.process(maintenance())
        for profile in self.cohort:
            if profile.arrival_time < horizon:
                env.process(patient(profile))
        env.process(monitor())
        env.run(until=horizon)
        started = {(e["patient_id"], e["stage"]): e["time_minute"] for e in trace if e["event"] == "queue_entered"}
        lab_waits = [e["time_minute"] - started[(e["patient_id"], "laboratory")]
            for e in trace if e["event"] == "service_started" and e["stage"] == "laboratory"]
        arrived = sum(p.arrival_time < horizon for p in self.cohort)
        lab_busy = sum(max(0, min(end, horizon) - start) for start, end in busy_lab)
        med = lambda values: round(median(values), 2) if values else 0
        p90 = lambda values: round(sorted(values)[min(len(values) - 1, int((len(values) - 1) * .9))], 2) if values else 0
        return {"status": "completed", "seed": self.seed, "model_version": self.MODEL_VERSION,
            "data_mode": "simulation_prediction", "simulated_duration_minutes": horizon,
            "total_patients_arrived": arrived, "completed_visits": len(outcomes), "unfinished_visits": arrived - len(outcomes),
            "completion_rate_percent": round(100 * len(outcomes) / max(arrived, 1), 1),
            "median_waiting_time_minutes": med(lab_waits), "median_lab_waiting_time_minutes": med(lab_waits),
            "p90_waiting_time_minutes": p90(lab_waits), "mean_waiting_time_minutes": round(mean(lab_waits), 2) if lab_waits else 0,
            "median_total_waiting_time": med([o["waiting_minutes"] for o in outcomes]),
            "median_total_time_minutes": med([o["duration_minutes"] for o in outcomes]),
            "median_travel_minutes": med([o["travel_minutes"] for o in outcomes]),
            "average_walking_distance_m": round(mean([o["travel_minutes"] * 60 for o in outcomes]), 1) if outcomes else 0,
            "max_queue_length": max((s["lab_queue"] for s in samples), default=0),
            "max_ct_queue": max((s["ct_queue"] for s in samples), default=0),
            "resource_utilization": round(lab_busy / (lab_count * horizon), 4),
            "queue_timeline": samples, "patient_outcomes": outcomes, "event_trace": trace,
            "assumptions": {"cohort_size": self.total_cohort_size, "lab_counters": lab_count,
                "lab_staff": lab_staff, "lab_service_minutes": service_time, "travel_minutes_per_leg": travel,
                "ct_online": config.get("ct_online", True), "fast_track_returning": config.get("fast_track_returning", False),
                "population": "Synthetic arrivals and service times; identical cohort across alternatives",
                "limits": "Finite horizon; completed-visit duration excludes unfinished visits; not clinically validated"}}
