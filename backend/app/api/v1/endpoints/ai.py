from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db.session import get_db
from app.services.ai_assistant import AIAssistantService
from app.core.deps import roles

router = APIRouter(dependencies=[Depends(roles("operator", "analyst", "director", "department_manager"))])

class AIQueryRequest(BaseModel):
    query: str
    room_id: Optional[str] = None
    alert_id: Optional[str] = None

@router.post("/query")
def chat_with_ai(req: AIQueryRequest, db: Session = Depends(get_db)):
    ai_service = AIAssistantService(db=db)
    result = ai_service.analyze_query(req.query, context={"room_id": req.room_id, "alert_id": req.alert_id})
    return result
