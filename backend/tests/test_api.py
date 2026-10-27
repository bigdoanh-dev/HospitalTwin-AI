from conftest import login


def test_public_health_and_capability_limits(client):
    assert client.get("/api/v1/health").json()["status"] == "healthy"
    assert client.get("/api/v1/system/features").json()["camera_CV"] == "not_implemented"


def test_refresh_rotation_and_logout_revoke_access(client):
    old = login(client)
    assert client.get("/api/v1/auth/me", headers=old).status_code == 200
    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert client.get("/api/v1/auth/me", headers=old).status_code == 401
    current = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert client.post("/api/v1/auth/logout", headers=current).status_code == 200
    assert client.get("/api/v1/auth/me", headers=current).status_code == 401


def test_anonymous_and_wrong_role_are_blocked(client):
    assert client.get("/api/v1/monitoring/overview").status_code == 401
    operator = login(client)
    assert client.post("/api/v1/interventions/INTV-001/decision", headers=operator, json={"decision": "approved"}).status_code == 403
    assert client.get("/api/v1/admin/users", headers=operator).status_code == 403
    assert client.post("/api/v1/interventions/tasks/update", headers=operator, json={"task_id": "TSK-001", "status": "completed"}).status_code == 409
    assert client.post("/api/v1/interventions/INTV-001/decision", headers=login(client, "director"), json={"decision": "invented"}).status_code == 422


def test_monitoring_matches_visits_and_camera_is_separate(client):
    auth = login(client)
    visits = client.get("/api/v1/operations/visits?limit=500", headers=auth).json()
    overview = client.get("/api/v1/monitoring/overview", headers=auth).json()
    assert overview["summary"]["total_visits"] == len(visits) == 360
    assert overview["summary"]["waiting_visits"] == sum(v["status"] in ("waiting", "called") for v in visits)
    room = client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=auth).json()
    assert room["current_queue_length"] == sum(v["current_room_id"] == "ROOM-LAB-101" and v["status"] in ("waiting", "called") for v in visits)
    assert room["people_present"] != room["current_queue_length"]
    history = client.get("/api/v1/monitoring/queue-history/ROOM-LAB-101", headers=auth).json()
    assert history[-1]["count"] == room["current_queue_length"]


def test_spatial_graph_and_floor_scope(client):
    auth = login(client)
    building = client.get("/api/v1/spatial/building", headers=auth).json()
    assert len(building["floors"]) == 4
    assert sum(len(f["rooms"]) for f in building["floors"]) >= 20
    route = client.get("/api/v1/spatial/route?source=ROOM-LAB-101&target=ROOM-IMG-302", headers=auth).json()
    assert route["distance_m"] > 0
    assert len({point[1] for point in route["points"]}) > 1
    scoped = client.get("/api/v1/monitoring/queue-by-location?floor_id=3F", headers=auth).json()
    assert all(row["floor_id"] == "FL-3F" for row in scoped)


def test_congestion_changes_connected_state_and_grounded_ai(client):
    auth = login(client)
    before = client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=auth).json()["current_queue_length"]
    result = client.post("/api/v1/demo/trigger-congestion", headers=auth)
    assert result.status_code == 200, result.text
    after = client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=auth).json()["current_queue_length"]
    assert after == before + 18
    answer = client.post("/api/v1/ai/query", headers=auth, json={"query": "Tại sao khu lấy mẫu đông?"}).json()
    assert str(after) in answer["response"]
    assert answer["mode"] == "Rule-based Demo Assistant"
    assert all(e["timestamp"] for e in answer["evidence"])
    assert "Chưa ước lượng" in answer["recommendations"][0]["expected_reduction"]


def test_ct_outage_is_idempotent_and_simulates_without_skipping(client):
    auth = login(client)
    assert client.post("/api/v1/demo/trigger-ct-incident", headers=auth).status_code == 200
    assert client.post("/api/v1/demo/trigger-ct-incident", headers=auth).status_code == 200
    alerts = client.get("/api/v1/monitoring/alerts", headers=auth).json()
    assert sum(a["id"] == "CT-INCIDENT" for a in alerts) == 1
    run = client.post("/api/v1/simulations/run", headers=auth, json={"ct_online": False, "repetitions": 1})
    assert run.status_code == 200, run.text
    assert run.json()["proposed"]["unfinished_visits"] > 0
    assert client.post("/api/v1/demo/restore-ct", headers=auth).status_code == 200


def test_simulation_noop_and_input_validation(client):
    auth = login(client)
    run = client.post("/api/v1/simulations/run", headers=auth, json={"lab_counters": 6, "lab_staff": 6, "repetitions": 1})
    assert run.status_code == 200, run.text
    assert run.json()["comparison"]["waiting_time_delta_minutes"] == 0
    bad = client.post("/api/v1/simulations/run", headers=auth, json={"lab_counters": 8, "lab_staff": 7})
    assert bad.status_code == 422


def test_draft_versions_do_not_change_operational_capacity(client):
    auth = login(client)
    payload = {"name": "Kịch bản thử", "config": {"lab_counters": 7, "lab_staff": 7, "service_time": 8}}
    created = client.post("/api/v1/scenarios", headers=auth, json=payload)
    assert created.status_code == 200, created.text
    first = created.json()
    payload["config"]["lab_counters"] = 8
    payload["config"]["lab_staff"] = 8
    second = client.post(f"/api/v1/scenarios/{first['id']}/versions", headers=auth, json=payload).json()
    assert second["versions"][0]["config"]["lab_counters"] == 7
    assert second["versions"][1]["config"]["lab_counters"] == 8
    assert client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=auth).json()["counters"] == 6


def test_approval_execution_evaluation_and_rollback(client):
    operator = login(client)
    run = client.post("/api/v1/simulations/run", headers=operator, json={"lab_counters": 7, "repetitions": 1}).json()
    created = client.post("/api/v1/interventions", headers=operator, json={"title": "Thêm bàn lấy mẫu", "simulation_run_id": run["simulation_id"]})
    assert created.status_code == 200, created.text
    iid = created.json()["id"]
    director = login(client, "director")
    decision = client.post(f"/api/v1/interventions/{iid}/decision", headers=director, json={"decision": "approved"})
    assert decision.status_code == 200, decision.text
    item = next(i for i in client.get("/api/v1/interventions", headers=operator).json() if i["id"] == iid)
    assert item["scenario_version_id"] == run["scenario_version_id"]
    staff = login(client, "department_manager")
    for task in item["tasks"]:
        result = client.post("/api/v1/interventions/tasks/update", headers=staff, json={"task_id": task["id"], "status": "completed"})
        assert result.status_code == 200, result.text
    assert client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=operator).json()["counters"] == 7
    evaluated = client.post(f"/api/v1/interventions/{iid}/evaluate", headers=operator)
    assert evaluated.status_code == 200
    assert set(("baseline", "predicted", "observed")) <= evaluated.json().keys()
    assert client.post(f"/api/v1/interventions/{iid}/rollback", headers=operator).status_code == 200
    assert client.get("/api/v1/spatial/rooms/ROOM-LAB-101", headers=operator).json()["counters"] == 6


def test_patient_cannot_read_other_visits_or_cameras(client):
    patient = login(client, "patient")
    own = client.get("/api/v1/operations/visits", headers=patient).json()
    assert own and all(v["patient_id"] == "PAT-0269" for v in own)
    assert client.get("/api/v1/operations/visits/VISIT-0001", headers=patient).status_code == 403
    assert client.get("/api/v1/cameras", headers=patient).status_code == 403


def test_complete_outpatient_journey_with_lab_result_gate(client):
    auth = login(client)
    registered = client.post("/api/v1/operations/register", headers=auth, json={"full_name": "Người bệnh kiểm thử", "payment_type": "bhyt"}).json()
    vid = registered["visit_id"]
    def post(path, **extra):
        response = client.post(f"/api/v1/operations/{path}", headers=auth, json={"visit_id": vid, **extra})
        assert response.status_code == 200, f"{path}: {response.text}"
        return response.json()
    def serve(room, complete=True):
        post("queue/call", room_id=room)
        post("queue/start", room_id=room)
        if complete:
            post("queue/complete", room_id=room)
    assert client.post("/api/v1/operations/queue/complete", headers=auth, json={"visit_id": vid}).status_code == 409
    serve("ROOM-REC-101")
    serve("ROOM-INS-101")
    serve("ROOM-EXAM-101", complete=False)
    post("doctor/order-lab", test_types=["Xét nghiệm mẫu A", "Xét nghiệm mẫu B"])
    serve("ROOM-LAB-101")
    assert client.post("/api/v1/operations/lab/result-ready", headers=auth, json={"visit_id": vid}).status_code == 409
    post("lab/process")
    post("lab/result-ready")
    serve("ROOM-EXAM-101")
    serve("ROOM-PAY-101")
    serve("ROOM-PHAR-101")
    visit = client.get(f"/api/v1/operations/visits/{vid}", headers=auth).json()
    assert visit["status"] == "completed"
    assert all(step["completed_at"] and step["started_at"] >= step["queued_at"] for step in visit["steps"])


def test_demo_role_switch_requires_session_and_is_disabled_outside_demo(client, monkeypatch):
    assert client.post("/api/v1/auth/switch-role", json={"role": "director"}).status_code == 401
    auth = login(client)
    assert client.post("/api/v1/auth/switch-role", headers=auth, json={"role": "director"}).json()["user"]["role"] == "director"
    from app.core.config import settings
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    assert client.post("/api/v1/auth/switch-role", headers=auth, json={"role": "director"}).status_code == 404


def test_reset_returns_a_valid_new_session_and_restores_data(client):
    admin = login(client, "admin")
    result = client.post("/api/v1/demo/reset", headers=admin)
    assert result.status_code == 200, result.text
    new_auth = {"Authorization": f"Bearer {result.json()['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=new_auth).status_code == 200
    assert client.get("/api/v1/monitoring/overview", headers=new_auth).json()["summary"]["total_visits"] == 360


def test_process_loop_without_exit_is_rejected(client):
    auth = login(client)
    request = {"name": "Vòng lặp lỗi", "nodes": [{"id": "a", "room_id": "ROOM-REC-101"},
        {"id": "b", "room_id": "ROOM-LAB-101"}], "edges": [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}]}
    result = client.post("/api/v1/scenarios/validate", headers=auth, json=request).json()
    assert result["valid"] is False
    assert any("vòng lặp" in message for message in result["errors"])
