"""Evidence retrieval and transparent rule-based operational analysis, without an LLM."""
import re
import unicodedata
from datetime import timedelta
from statistics import mean
from fastapi import HTTPException
from app.models.models import Room, Camera, Alert, StepExecution, PatientVisit
from app.services.domain import clock, room_metrics


def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text.lower().replace("đ", "d")) if not unicodedata.combining(c))


class AIAssistantService:
    def __init__(self, db):
        self.db = db

    def analyze_query(self, query, context=None):
        db, context = self.db, context or {}
        text = normalized(query)
        if any(word in text for word in ("ct", "su co", "thiet bi")):
            room_id = "ROOM-IMG-302"
        elif context.get("room_id"):
            room_id = context["room_id"]
        elif any(word in text for word in ("lay mau", "xet nghiem", "dong", "qua tai", "cho", "ban")):
            room_id = "ROOM-LAB-101"
        else:
            from app.api.v1.endpoints.monitoring import overview
            data = overview(db=db)
            summary = data["summary"]
            return {"response": f"**Tổng quan dữ liệu mô phỏng**\n\nCó {summary['total_visits']} lượt; {summary['completed_visits']} hoàn tất; {summary['waiting_visits']} đang chờ phục vụ. Thời gian chờ trung vị trên các bước đã hoàn tất là {summary['median_waiting_minutes']:g} phút.\n\nTôi hỗ trợ phân tích hàng đợi theo phòng, công suất lấy mẫu, sự cố CT và đề xuất cấu hình để mô phỏng.",
                "intent": "overview", "target_room_id": None, "mode": "Rule-based Demo Assistant", "data_mode": "synthetic",
                "evidence": [{"title": "Lượt khám", "value": str(summary["total_visits"]), "timestamp": clock(db).isoformat(), "kind": "observed_synthetic", "source": "patient_visits"}], "recommendations": []}
        room = db.get(Room, room_id)
        if not room:
            raise HTTPException(404, "Không tìm thấy địa điểm để phân tích")
        metrics = room_metrics(db, room)
        timestamp = clock(db).isoformat()
        evidence = [{"title": "Hàng đợi được ghi nhận", "value": f"{metrics['queue_length']} người", "room_id": room.id,
                "timestamp": timestamp, "source": "patient_visits", "kind": "observed_synthetic", "status": "critical" if metrics["queue_length"] > 50 else "normal"},
            {"title": "Trung vị thời gian chờ", "value": f"{metrics['median_waiting_time']:g} phút", "room_id": room.id,
                "timestamp": timestamp, "source": "step_execution_timestamps", "kind": "observed_synthetic", "sample_size": metrics["sample_size"]},
            {"title": "Nguồn lực hoạt động", "value": f"{room.counters} bàn / {room.active_staff} nhân viên", "room_id": room.id,
                "timestamp": timestamp, "source": "room_resources", "kind": "observed_synthetic"}]
        camera = db.query(Camera).filter_by(room_id=room.id, is_online=True).first()
        if camera:
            evidence.append({"title": f"{camera.id} · số đếm giả lập", "value": f"{camera.people_count} người hiện diện", "room_id": room.id,
                "timestamp": camera.last_update.isoformat(), "source": "synthetic_camera_fixture", "kind": "synthetic_observation"})
        alerts = db.query(Alert).filter_by(room_id=room.id, status="active").all()
        if room.id == "ROOM-IMG-302":
            response = f"**Trạng thái CT trong dữ liệu demo ({room.id})**\n\nPhòng đang **{room.status}**, có {metrics['queue_length']} lượt chờ. "
            response += "Đã ghi nhận sự cố giả lập; các chỉ định vẫn được giữ trong hàng đợi. " if room.status == "offline" else "Chưa ghi nhận trạng thái ngừng hoạt động. "
            response += "Chưa cấu hình máy CT dự phòng; không đủ căn cứ đề xuất chuyển ca sang một máy khác. Có thể mô phỏng tác động của ngừng hoạt động/khôi phục thiết bị trước khi quyết định điều phối."
            return {"response": response, "evidence": evidence,
                "recommendations": [{"id": "CT-WHATIF", "title": "Mô phỏng khả dụng của CT", "description": "Giữ nguyên nhu cầu chỉ định; thay đổi trạng thái thiết bị trong mô hình.",
                    "action_type": "ct_availability", "params": {"ct_online": room.status == "offline"}, "simulation_ready": True}],
                "intent": "ct_incident", "target_room_id": room.id, "mode": "Rule-based Demo Assistant", "data_mode": "synthetic"}
        completed = db.query(StepExecution).filter_by(room_id=room.id, status="completed").all()
        services = [s.service_duration_minutes for s in completed if s.service_duration_minutes and s.service_duration_minutes > 0]
        service_time = mean(services) if services else 8
        capacity = min(room.counters, room.active_staff) * 60 / service_time if service_time else 0
        arrivals = db.query(StepExecution).filter(StepExecution.room_id == room.id,
            StepExecution.queued_at >= clock(db) - timedelta(minutes=30), StepExecution.queued_at <= clock(db)).count()
        arrival_rate = arrivals * 2
        evidence += [{"title": "Lượt vào hàng đợi 30 phút", "value": str(arrivals), "room_id": room.id, "timestamp": timestamp,
                "kind": "observed_synthetic", "source": "step_queue_events"},
            {"title": "Công suất ước lượng", "value": f"{capacity:.1f} lượt/giờ", "room_id": room.id, "timestamp": timestamp,
                "kind": "model_estimate", "source": "counters_staff_and_service_duration"}]
        hypothesis = ("Tốc độ đến gần đây cao hơn công suất ước lượng, có thể góp phần tích lũy hàng đợi."
            if arrival_rate > capacity else "Lưu lượng 30 phút gần đây chưa vượt công suất ước lượng; hàng đợi có thể là tồn đọng từ trước hoặc do biến động thời gian phục vụ.")
        response = (f"**Phân tích dữ liệu mô phỏng: {room.name} ({room.id})**\n\n"
            f"• Hàng đợi: **{metrics['queue_length']}** lượt; đang phục vụ: **{metrics['being_served']}**.\n"
            f"• Chờ trung vị: **{metrics['median_waiting_time']:g} phút**, tính từ {metrics['sample_size']} bước đã hoàn tất.\n"
            f"• Công suất: {room.counters} bàn, {room.active_staff} nhân viên; thời gian phục vụ từ dữ liệu mẫu {service_time:.1f} phút/ca.\n"
            f"• {arrivals} lượt vào hàng đợi trong 30 phút, tương đương {arrival_rate} lượt/giờ; công suất ước lượng {capacity:.1f} lượt/giờ.\n\n"
            f"**Giả thuyết cần kiểm tra:** {hypothesis} Đây chưa phải kết luận nhân quả.\n\n"
            "Số người hiện diện từ camera là số đếm giả lập riêng, không phải số người bệnh chờ. Mức cải thiện chỉ có sau khi chạy mô phỏng; chưa có bằng chứng triển khai thực tế.")
        delta_match = re.search(r"(?:them|bo sung|mo)\s*(\d+)", text)
        delta = int(delta_match.group(1)) if delta_match else 1
        time_values = re.findall(r"\b([0-2]?\d:[0-5]\d)\b", query)
        config = {"lab_counters": room.counters + delta, "lab_staff": room.active_staff + delta,
            "service_time": round(service_time, 1), "room_id": room.id}
        draft = {"operation": "increase_counter_capacity", "service_point_id": "SP-LAB-01", "room_id": room.id,
            "counter_delta": delta, "start_time": time_values[0] if time_values else None,
            "end_time": time_values[1] if len(time_values) > 1 else None, "status": "draft", "config": config,
            "missing_fields": [] if len(time_values) > 1 else ["start_time", "end_time"]}
        recommendations = []
        if room.room_type == "laboratory":
            recommendations.append({"id": "LAB-CAPACITY", "title": f"Thử bổ sung {delta} bàn lấy mẫu và {delta} nhân viên",
                "description": "Dùng nhân sự/bàn dự phòng trong mô hình; cần xác nhận khung giờ và phê duyệt trước khi thực hiện.",
                "action_type": "open_counter", "params": config, "expected_reduction": "Chưa ước lượng · cần chạy mô phỏng",
                "simulation_ready": 1 <= delta <= 2, "assumptions": ["Tối đa hai bàn và hai nhân sự dự phòng trong demo"]})
        return {"response": response, "evidence": evidence, "recommendations": recommendations,
            "intent": "scenario_draft" if delta_match else "lab_congestion", "target_room_id": room.id,
            "structured_draft": draft if delta_match else None, "mode": "Rule-based Demo Assistant", "data_mode": "synthetic",
            "hypotheses": [hypothesis], "related_alerts": [a.id for a in alerts],
            "dependencies": [{"from": "consultation", "to": "laboratory", "relation": "creates_order"},
                {"from": "laboratory", "to": "result_processing", "relation": "sample_required"},
                {"from": "result_processing", "to": "return_consultation", "relation": "result_ready_required"}]}
