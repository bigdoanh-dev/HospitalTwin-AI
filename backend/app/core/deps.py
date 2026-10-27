from datetime import datetime, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.models import User, UserSession

bearer = HTTPBearer(auto_error=False)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(credentials.credentials) if credentials else None
    if not payload:
        raise HTTPException(401, "Vui lòng đăng nhập lại", headers={"WWW-Authenticate": "Bearer"})
    user = db.get(User, payload.get("sub"))
    session = db.get(UserSession, payload.get("sid")) if payload.get("sid") else None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not user or not user.is_active or not session or session.user_id != user.id or session.revoked or session.expires_at <= now:
        raise HTTPException(401, "Phiên đăng nhập đã hết hạn")
    return user


def roles(*allowed: str):
    def check(user: User = Depends(current_user)):
        if user.role != "admin" and user.role not in allowed:
            raise HTTPException(403, "Vai trò hiện tại không có quyền thực hiện thao tác này")
        return user
    return check
