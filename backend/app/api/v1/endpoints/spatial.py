from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.models.models import Building, Floor, Room, Camera, ServicePoint
from app.core.deps import current_user
from app.services.domain import room_metrics, clock

router = APIRouter(dependencies=[Depends(current_user)])

@router.get("/building")
def get_building_spatial_data(db: Session = Depends(get_db)):
    building = db.query(Building).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    floors = db.query(Floor).filter(Floor.building_id == building.id).order_by(Floor.level.asc()).all()
    rooms = db.query(Room).all()
    cameras = db.query(Camera).all()

    floors_list = []
    for f in floors:
        f_rooms = [
            {
                "id": r.id,
                "name": r.name,
                "room_type": r.room_type,
                "department_id": r.department_id,
                "floor_id": f.id,
                "x": r.x,
                "y": r.y,
                "z": r.z,
                "width": r.width,
                "length": r.length,
                "capacity": r.capacity,
                "counters": r.counters,
                "active_staff": r.active_staff,
                "current_queue_length": r.current_queue_length,
                "current_waiting_time": r.current_waiting_time,
                "status": r.status,
                "cameras": [c.id for c in r.cameras]
            }
            for r in rooms if r.floor_id == f.id
        ]
        floors_list.append({
            "id": f.id,
            "name": f.name,
            "level": f.level,
            "elevation": f.elevation,
            "rooms": f_rooms
        })

    return {
        "building": {
            "id": building.id,
            "name": building.name,
            "code": building.code
        },
        "floors": floors_list,
        "cameras": [
            {
                "id": c.id,
                "name": c.name,
                "room_id": c.room_id,
                "source_type": c.source_type,
                "is_online": c.is_online,
                "people_count": c.people_count,
                "confidence": c.confidence
            }
            for c in cameras
        ]
    }

@router.get("/rooms/{room_id}")
def get_room_details(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    cameras = db.query(Camera).filter(Camera.room_id == room_id).all()
    service_points = db.query(ServicePoint).filter(ServicePoint.room_id == room_id).all()

    # People present estimation: sum of cameras or proportional
    metrics = room_metrics(db, room)
    people_present = metrics["people_present"]

    return {
        "id": room.id,
        "name": room.name,
        "floor_id": room.floor_id,
        "department_id": room.department_id,
        "room_type": room.room_type,
        "capacity": room.capacity,
        "counters": room.counters,
        "active_staff": room.active_staff,
        "current_queue_length": room.current_queue_length,
        "current_waiting_time": room.current_waiting_time,
        "people_present": people_present,
        "being_served": metrics["being_served"],
        "waiting_for_results": metrics["waiting_for_results"],
        "median_current_wait_age": metrics["median_current_wait_age"],
        "sample_size": metrics["sample_size"],
        "data_mode": "synthetic",
        "source": "step_execution_timestamps",
        "measured_at": clock(db).isoformat(),
        "status": room.status,
        "cameras": [
            {
                "id": c.id,
                "name": c.name,
                "source_type": c.source_type,
                "is_online": c.is_online,
                "people_count": c.people_count
            }
            for c in cameras
        ],
        "service_points": [
            {
                "id": sp.id,
                "name": sp.name,
                "service_type": sp.service_type,
                "active": sp.active
            }
            for sp in service_points
        ]
    }


@router.get("/route")
def spatial_route(source: str, target: str, db: Session = Depends(get_db)):
    """Shortest path over the explicit simplified demo corridor/elevator graph."""
    import heapq
    import math
    rooms = db.query(Room).all()
    nodes, adjacency = {}, {}
    for room in rooms:
        nodes[room.id] = [room.x, room.y + .2, room.z]
        nodes[f"CORRIDOR-{room.floor_id}"] = [22, room.y + .2, 0]
    def connect(a, b, factor=1):
        distance = math.dist(nodes[a], nodes[b]) * factor
        adjacency.setdefault(a, []).append((b, distance))
        adjacency.setdefault(b, []).append((a, distance))
    for room in rooms:
        connect(room.id, f"CORRIDOR-{room.floor_id}")
    floors = db.query(Floor).order_by(Floor.elevation).all()
    for a, b in zip(floors, floors[1:]):
        connect(f"CORRIDOR-{a.id}", f"CORRIDOR-{b.id}", 3)
    if source not in nodes or target not in nodes:
        raise HTTPException(404, "Địa điểm không tồn tại")
    queue = [(0, source, [source])]
    seen = set()
    while queue:
        distance, node, path = heapq.heappop(queue)
        if node in seen:
            continue
        seen.add(node)
        if node == target:
            return {"nodes": path, "points": [nodes[item] for item in path],
                "distance_m": round(distance, 1), "travel_minutes": round(distance / 60, 2),
                "source": "synthetic_corridor_graph", "assumption": "Tốc độ 1 m/s; kết nối tầng là mô hình minh họa"}
        for next_node, weight in adjacency.get(node, []):
            if next_node not in seen:
                heapq.heappush(queue, (distance + weight, next_node, path + [next_node]))
    raise HTTPException(422, "Không tìm thấy đường đi")
