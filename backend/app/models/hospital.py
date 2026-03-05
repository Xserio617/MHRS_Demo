from typing import List
from sqlalchemy import Table, Column, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

# 1. ARA TABLO (Association Table)
# Bu tablo model sınıfı olarak değil, doğrudan SQLAlchemy Table objesi olarak tanımlanır.
# Sadece doktor_id ve clinic_id tutar. İkisi birleşip Primary Key olur.
doctor_clinic_m2m = Table(
    "doctor_clinic_m2m",
    Base.metadata,
    Column("doctor_id", ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True),
    Column("clinic_id", ForeignKey("clinics.id", ondelete="CASCADE"), primary_key=True),
)


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    clinics: Mapped[List["Clinic"]] = relationship(
        "Clinic",
        back_populates="hospital",
        cascade="all, delete-orphan",
    )

class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="clinics")

    # Secondary parametresi ile ara tabloyu gösteriyoruz
    doctors: Mapped[List["Doctor"]] = relationship(
        secondary=doctor_clinic_m2m, 
        back_populates="clinics"
    )