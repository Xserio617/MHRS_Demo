from datetime import date, datetime, time
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException, status
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.schemas.appointment import AppointmentCreate
from app.search.es_client import (
    build_appointment_document,
    index_appointment_document,
    search_patient_appointments_in_es,
)

def create_appointment(db: Session, patient_id: int, appointment_in: AppointmentCreate) -> Appointment:
    stmt_doc = select(Doctor).where(Doctor.id == appointment_in.doctor_id)
    doctor = db.execute(stmt_doc).scalar_one_or_none()
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doktor bulunamadı.")

    # 2. KURAL: Doktorun o saatte başka AKTİF bir randevusu var mı?
    # SQLAlchemy 2.0 and_ kullanımı
    stmt_conflict_doctor = select(Appointment).where(
        and_(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == appointment_in.appointment_date,
            Appointment.status == AppointmentStatus.ACTIVE
        )
    )
    if db.execute(stmt_conflict_doctor).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Seçilen saatte doktorun başka bir randevusu bulunmaktadır."
        )

    # 3. KURAL: Hastanın kendisi o saatte klonlanıp başka doktora gidemez!
    stmt_conflict_patient = select(Appointment).where(
        and_(
            Appointment.patient_id == patient_id,
            Appointment.appointment_date == appointment_in.appointment_date,
            Appointment.status == AppointmentStatus.ACTIVE
        )
    )
    if db.execute(stmt_conflict_patient).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Aynı saat diliminde aktif bir randevunuz zaten bulunuyor."
        )

    # 4. Kuralları geçtiysek randevuyu oluştur
    new_appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        appointment_date=appointment_in.appointment_date
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    try:
        document = build_appointment_document(new_appointment)
        index_appointment_document(document)
    except Exception as exc:
        print(f"[ES] Randevu indeksleme atlandı: {exc}")
    
    return new_appointment


def get_patient_appointments(db: Session, patient_id: int) -> list[Appointment]:
    stmt = select(Appointment).where(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date.desc())
    return db.execute(stmt).scalars().all()


def get_doctor_appointments_by_user_id(db: Session, user_id: int) -> list[Appointment]:
    stmt_doctor = select(Doctor).where(Doctor.user_id == user_id)
    doctor = db.execute(stmt_doctor).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doktor kaydı bulunamadı.")

    stmt_appointments = select(Appointment).where(Appointment.doctor_id == doctor.id).order_by(Appointment.appointment_date.asc())
    return db.execute(stmt_appointments).scalars().all()


def get_appointment_by_uid(db: Session, uid: str) -> Appointment | None:
    stmt = select(Appointment).where(Appointment.uid == uid)
    return db.execute(stmt).scalar_one_or_none()


def cancel_appointment(db: Session, appointment: Appointment) -> Appointment:
    appointment.status = AppointmentStatus.CANCELLED
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    try:
        document = build_appointment_document(appointment)
        index_appointment_document(document)
    except Exception as exc:
        print(f"[ES] Randevu güncelleme atlandı: {exc}")

    return appointment


def get_doctor_busy_times_for_date(db: Session, doctor_id: int, target_date: date) -> list[str]:
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)

    stmt = select(Appointment.appointment_date).where(
        and_(
            Appointment.doctor_id == doctor_id,
            Appointment.status == AppointmentStatus.ACTIVE,
            Appointment.appointment_date >= start_of_day,
            Appointment.appointment_date <= end_of_day,
        )
    )
    appointment_dates = db.execute(stmt).scalars().all()
    return sorted({appointment_date.strftime("%H:%M") for appointment_date in appointment_dates})


def get_patient_appointments_from_es(patient_id: int) -> list[dict]:
    return search_patient_appointments_in_es(patient_id=patient_id)