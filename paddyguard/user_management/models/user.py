"""SQLAlchemy User model."""
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _resolve_database_url():
    postgres_url = os.getenv("POSTGRES_URL")
    if postgres_url:
        return postgres_url

    if os.getenv("USE_SQLITE", "true").lower() in {"1", "true", "yes", "on"}:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "user_management.db"))
        return f"sqlite:///{db_path}"

    return "postgresql://paddyguard:paddyguard123@postgres:5432/paddyguard_db"


DATABASE_URL = _resolve_database_url()
engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
