"""Behavioral contracts for the lightweight hospital simulation."""

from app.services.simulation import HospitalSimulation


def test_same_inputs_reproduce_simulation():
    config = {"lab_counters": 6, "ct_online": True}
    first = HospitalSimulation(seed=42).run(config)
    second = HospitalSimulation(seed=42).run(config)
    assert first == second


def test_ct_outage_is_a_supported_scenario():
    result = HospitalSimulation(seed=42).run({"ct_online": False})
    assert result["status"] == "completed"
    assert result["completed_visits"] <= result["total_patients_arrived"]


def test_patient_conservation_includes_unfinished_visits():
    result = HospitalSimulation(seed=42).run({"lab_counters": 2})
    assert result["completed_visits"] + result["unfinished_visits"] == result["total_patients_arrived"]


def test_waiting_percentile_is_not_below_median():
    result = HospitalSimulation(seed=42).run({"lab_counters": 6})
    assert result["p90_waiting_time_minutes"] >= result["median_waiting_time_minutes"] >= 0


def test_scenario_change_affects_computed_results():
    baseline = HospitalSimulation(seed=42).run({"lab_counters": 4})
    expanded = HospitalSimulation(seed=42).run({"lab_counters": 8})
    assert expanded["median_waiting_time_minutes"] < baseline["median_waiting_time_minutes"]


def test_total_waiting_is_computed_per_patient_not_by_adding_stage_medians():
    from statistics import median
    result = HospitalSimulation(seed=42).run()
    expected = round(median(p["waiting_minutes"] for p in result["patient_outcomes"]), 2)
    assert result["median_total_waiting_time"] == expected


def test_reusing_model_does_not_change_random_cohort():
    model = HospitalSimulation(seed=42)
    before = model.run({"lab_counters": 6})
    model.run({"lab_counters": 8})
    assert model.run({"lab_counters": 6}) == before


def test_offline_ct_never_completes_an_ordered_ct():
    result = HospitalSimulation(seed=42).run({"ct_online": False})
    assert not any(e["event"] == "service_completed" and e["stage"] == "ct" for e in result["event_trace"])
