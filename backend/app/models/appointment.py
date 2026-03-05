import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.mysql import CHAR
import enum

from app.core.database import Base

# Randevu durumlarını standartlaştırmak için Python Enum kullanıyoruz
class AppointmentStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Dışarıya açılacak güvenli randevu ID'si
    uid: Mapped[str] = mapped_column(
        CHAR(36), default=lambda: str(uuid.uuid4()), unique=True, index=True, nullable=False
    )
    
    # Kim randevu aldı? (Hasta)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Kimden randevu alındı? (Doktor)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    
    # Randevu Tarihi ve Saati
    appointment_date: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    
    # Randevunun anlık durumu
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), default=AppointmentStatus.ACTIVE, nullable=False
    )
    
    # Randevunun ne zaman oluşturulduğu (Loglama ve analiz için)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # İlişkiler (Sorgularken doktorun veya hastanın bilgilerini çekebilmek için)
    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_id])
    doctor: Mapped["Doctor"] = relationship("Doctor", foreign_keys=[doctor_id])