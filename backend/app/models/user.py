import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.mysql import CHAR
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    # Sadece veritabanı içi ilişkilerde (foreign key) kullanılacak sayısal ID
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # DIŞARIYA (Frontend'e) verilecek olan, kırılması zor, tahmin edilemez kimlik (UID)
    # Varsayılan değer olarak otomatik uuid4 üretecek.
    uid: Mapped[str] = mapped_column(
        CHAR(36), 
        default=lambda: str(uuid.uuid4()), 
        unique=True, 
        index=True, 
        nullable=False
    )
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    is_active: Mapped[bool] = mapped_column(default=True)
    is_doctor: Mapped[bool] = mapped_column(default=False)
    wants_doctor_role: Mapped[bool] = mapped_column(default=False)
    doctor_application_status: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    preferred_hospital_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refresh_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)