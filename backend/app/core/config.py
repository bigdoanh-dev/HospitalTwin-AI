import os
import secrets
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "HospitalTwin-AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY") or secrets.token_urlsafe(48)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "demo123")
    BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))
    DATABASE_URL: str = os.getenv("DATABASE_URL") or f"sqlite:///{Path(__file__).resolve().parents[2] / 'hospital_twin.db'}"
    RANDOM_SEED: int = int(os.getenv("RANDOM_SEED", "42"))

settings = Settings()
