from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import roles
from app.models.models import User, AuditLog
from app.services.domain import audit, synchronized
from app.api.v1.endpoints.auth import public_user

router = APIRouter(dependencies=[Depends(roles())])


@router.get("/users")
def users(db: Session = Depends(get_db)):
    return [{**public_user(user), "is_active": user.is_active} for user in db.query(User).all()]


@router.get("/audit")
def audit_log(db: Session = Depends(get_db)):
    return [{"id": row.id, "user_role": row.user_role, "action": row.action, "details": row.details,
        "timestamp": row.timestamp.isoformat()} for row in db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()]


class UserUpdate(BaseModel):
    is_active: bool


@router.patch("/users/{user_id}")
@synchronized
def update_user(user_id: str, req: UserUpdate, user: User = Depends(roles()), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404)
    if target.id == user.id:
        raise HTTPException(409, "Không tự vô hiệu hóa tài khoản đang thao tác")
    target.is_active = req.is_active
    audit(db, user, "UPDATE_USER", f"{target.id}: active={req.is_active}")
    db.commit()
    return {**public_user(target), "is_active": target.is_active}
