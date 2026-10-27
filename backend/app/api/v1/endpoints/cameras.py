from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Camera
from app.core.deps import roles
from pydantic import BaseModel
from fastapi import HTTPException

router = APIRouter(dependencies=[Depends(roles("operator", "director", "camera_operator", "department_manager"))])

@router.get("")
def list_cameras(db: Session = Depends(get_db)):
    cams = db.query(Camera).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "room_id": c.room_id,
            "source_type": c.source_type, # synthetic_simulation
            "label_type": "Mô phỏng video", # Explicitly NOT "Trực tiếp"
            "is_online": c.is_online,
            "people_count": c.people_count,
            "confidence": c.confidence,
            "analytics_mode": "synthetic_fixture_no_cv_inference",
            "confidence_kind": "fixture_parameter_not_model_accuracy",
            "last_update": c.last_update.strftime("%H:%M:%S")
        }
        for c in cams
    ]

class CameraStatus(BaseModel):
    is_online: bool

@router.patch("/{camera_id}")
def update_status(camera_id: str, req: CameraStatus, db: Session = Depends(get_db), user=Depends(roles("operator", "camera_operator"))):
    camera = db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(404)
    from app.services.domain import audit, clock
    camera.is_online = req.is_online
    camera.last_update = clock(db)
    audit(db, user, "CAMERA_STATUS", f"{camera.id}: online={req.is_online}")
    db.commit()
    return {"id": camera.id, "is_online": camera.is_online, "source_type": camera.source_type}
