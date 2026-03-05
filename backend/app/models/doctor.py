from typing import List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.core.database import Base
from app.models.hospital import Clinic, doctor_clinic_m2m

class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Sisteme giriş yapacakları User hesabı ile birebir (1-1) ilişki
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    
    # Doktorun çalıştığı klinik (Poliklinik)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), nullable=False)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(50)) # Örn: "Uzm. Dr.", "Prof. Dr."
    doctor_type: Mapped[str] = mapped_column(String(20), nullable=False, default="tam")
    shift_start: Mapped[str] = mapped_column(String(5), nullable=False, default="08:30")
    shift_end: Mapped[str] = mapped_column(String(5), nullable=False, default="17:00")

    # Ana klinik ilişkisi (clinic_id FK üzerinden)
    clinic: Mapped["Clinic"] = relationship("Clinic", foreign_keys=[clinic_id])

    # Doktorun bağlı olduğu kullanıcı hesabı
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    # Çoka-çok ilişki: doktorun bağlı olduğu klinikler
    clinics: Mapped[List["Clinic"]] = relationship(
        "Clinic",
        secondary=doctor_clinic_m2m,
        back_populates="doctors",
    )
    
    # İsteğe bağlı: User modeline de back_populates eklenebilir.