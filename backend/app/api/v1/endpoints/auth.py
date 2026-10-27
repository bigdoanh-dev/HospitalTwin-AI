import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.deps import current_user
from app.core.security import verify_password, create_access_token
from app.models.models import User, UserSession, AuditLog

router = APIRouter()
attempts = defaultdict(deque)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class SwitchRoleRequest(BaseModel):
    role: str


def public_user(user: User):
    return {"id": user.id, "username": user.username, "full_name": user.full_name,
            "role": user.role, "email": user.email, "patient_id": user.patient_id}


def issue_session(user: User, db: Session, response: Response):
    from app.services.domain import clock
    refresh = secrets.token_urlsafe(48)
    session = UserSession(id=str(uuid4()), user_id=user.id,
        refresh_hash=hashlib.sha256(refresh.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=8), revoked=False)
    db.add(session)
    db.add(AuditLog(id=f"AUD-{uuid4().hex}", user_id=user.id, user_role=user.role,
        action="LOGIN", details="Đăng nhập tài khoản trình diễn", timestamp=clock(db)))
    db.commit()
    response.set_cookie("hospital_refresh", refresh, httponly=True, samesite="lax",
        secure=not settings.DEMO_MODE, path="/api/v1/auth", max_age=8 * 3600)
    return {"access_token": create_access_token(user.id, user.role, session_id=session.id),
            "token_type": "bearer", "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": public_user(user), "demo_mode": settings.DEMO_MODE}


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    history = attempts[req.username]
    now = time.monotonic()
    while history and history[0] < now - 60:
        history.popleft()
    if len(history) >= 10:
        raise HTTPException(429, "Vui lòng đợi một phút trước khi đăng nhập lại")
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not user.is_active or not verify_password(req.password, user.hashed_password):
        history.append(now)
        raise HTTPException(401, "Tên đăng nhập hoặc mật khẩu không chính xác")
    history.clear()
    return issue_session(user, db, response)


@router.get("/demo-users")
def demo_users(db: Session = Depends(get_db)):
    if not settings.DEMO_MODE:
        raise HTTPException(404)
    return [public_user(user) for user in db.query(User).all()]


@router.get("/me")
def me(user: User = Depends(current_user)):
    return public_user(user)


@router.post("/switch-role")
def switch_role(req: SwitchRoleRequest, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not settings.DEMO_MODE:
        raise HTTPException(404)
    target = db.query(User).filter(User.role == req.role).first()
    if not target:
        raise HTTPException(422, "Vai trò trình diễn không tồn tại")
    return issue_session(target, db, response)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    cookie = request.cookies.get("hospital_refresh", "")
    session = db.query(UserSession).filter(UserSession.refresh_hash == hashlib.sha256(cookie.encode()).hexdigest()).first()
    if not cookie or not session or session.revoked or session.expires_at <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(401, "Phiên làm việc không còn hiệu lực")
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401)
    session.revoked = True
    return issue_session(user, db, response)


@router.post("/logout")
def logout(request: Request, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    from app.core.security import decode_access_token
    payload = decode_access_token(request.headers.get("authorization", "").removeprefix("Bearer "))
    session = db.get(UserSession, payload["sid"])
    session.revoked = True
    db.commit()
    response.delete_cookie("hospital_refresh", path="/api/v1/auth")
    return {"message": "Đã đăng xuất"}
