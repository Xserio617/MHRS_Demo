import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.doctor import Doctor
from app.models.hospital import Clinic
from app.models.user import User
from app.schemas.doctor import DoctorAdminItem, DoctorCreate, DoctorUpdate
from app.search.es_client import index_doctor_document, remove_doctor_document
from app.tasks.rabbitmq import publish_message

SHIFT_PRESETS: dict[str, tuple[str, str]] = {
    "tam": ("08:30", "17:00"),
    "nobetci": ("16:00", "08:00"),
}


def _resolve_shift(doctor_type: str) -> tuple[str, str]:
    if doctor_type not in SHIFT_PRESETS:
        raise HTTPException(status_code=400, detail="Doktor türü 'tam' veya 'nobetci' olmalıdır.")
    return SHIFT_PRESETS[doctor_type]


def _doctor_to_admin_item(doctor: Doctor) -> DoctorAdminItem:
    hospital_name = doctor.clinic.hospital.name if doctor.clinic and doctor.clinic.hospital else "Bilinmiyor"
    clinic_name = doctor.clinic.name if doctor.clinic else "Bilinmiyor"
    return DoctorAdminItem(
        id=doctor.id,
        user_uid=doctor.user.uid,
        user_email=doctor.user.email,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        title=doctor.title,
        hospital_name=hospital_name,
        clinic_id=doctor.clinic_id,
        clinic_name=clinic_name,
        doctor_type=doctor.doctor_type,
        shift_start=doctor.shift_start,
        shift_end=doctor.shift_end,
    )


def _build_es_payload(doctor: Doctor, clinics: list[Clinic]) -> dict:
    hospitals = sorted({clinic.hospital.name for clinic in clinics if clinic.hospital is not None})
    cities = sorted({clinic.hospital.city for clinic in clinics if clinic.hospital is not None and clinic.hospital.city})
    return {
        "doctor_id": doctor.id,
        "full_name": f"{doctor.first_name} {doctor.last_name}",
        "title": doctor.title,
        "clinics": [clinic.name for clinic in clinics],
        "hospitals": hospitals,
        "cities": cities,
    }

def create_doctor(db: Session, doctor_in: DoctorCreate):
    # 1. Kullanıcıyı UID ile bul
    stmt_user = select(User).where(User.uid == str(doctor_in.user_uid))
    user = db.execute(stmt_user).scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if user.is_doctor:
        raise HTTPException(status_code=400, detail="Kullanıcı zaten doktor rolünde.")

    has_pending_application = user.doctor_application_status == "pending" or user.wants_doctor_role

    if not has_pending_application:
        raise HTTPException(status_code=400, detail="Bu kullanıcı için bekleyen doktor başvurusu bulunmamaktadır.")

    # 2. Kullanıcının rolünü "Doktor" olarak güncelle
    user.is_doctor = True
    user.wants_doctor_role = False
    user.doctor_application_status = "approved"

    # 3. Klinikleri bul
    stmt_clinics = select(Clinic).where(Clinic.id.in_(doctor_in.clinic_ids))
    clinics = db.execute(stmt_clinics).scalars().all()

    if not clinics:
        raise HTTPException(status_code=404, detail="Geçerli klinik bulunamadı.")

    # 4. Doktoru oluştur (Ana klinik olarak seçilen ilk kliniği atıyoruz)
    shift_start, shift_end = _resolve_shift(doctor_in.doctor_type)

    db_doctor = Doctor(
        user_id=user.id,
        clinic_id=clinics[0].id,
        first_name=doctor_in.first_name,
        last_name=doctor_in.last_name,
        title=doctor_in.title,
        doctor_type=doctor_in.doctor_type,
        shift_start=shift_start,
        shift_end=shift_end,
    )
    
    # Çoka-çok ilişki tablosuna klinikleri ekliyoruz
    db_doctor.clinics.extend(clinics)

    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)

    es_data = _build_es_payload(db_doctor, clinics)
    try:
        index_doctor_document(es_data)
    except Exception as exc:
        print(f"[ES] Doktor indeksleme atlandı: {exc}")

    try:
        asyncio.run(publish_message(queue_name="sync_doctor_to_es", message=es_data))
    except Exception as exc:
        print(f"[RabbitMQ] Doktor sync kuyruğuna mesaj bırakılamadı: {exc}")

    return db_doctor


def list_doctors(db: Session) -> list[DoctorAdminItem]:
    stmt = select(Doctor).order_by(Doctor.id.asc())
    doctors = db.execute(stmt).scalars().all()
    return [_doctor_to_admin_item(doctor) for doctor in doctors]


def update_doctor(db: Session, doctor_id: int, doctor_in: DoctorUpdate) -> DoctorAdminItem:
    doctor = db.execute(select(Doctor).where(Doctor.id == doctor_id)).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doktor bulunamadı.")

    clinic = db.execute(select(Clinic).where(Clinic.id == doctor_in.clinic_id)).scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Klinik bulunamadı.")

    shift_start, shift_end = _resolve_shift(doctor_in.doctor_type)

    doctor.first_name = doctor_in.first_name
    doctor.last_name = doctor_in.last_name
    doctor.title = doctor_in.title
    doctor.clinic_id = clinic.id
    doctor.clinics = [clinic]
    doctor.doctor_type = doctor_in.doctor_type
    doctor.shift_start = shift_start
    doctor.shift_end = shift_end

    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    es_data = _build_es_payload(doctor, [clinic])
    try:
        index_doctor_document(es_data)
    except Exception as exc:
        print(f"[ES] Doktor indeksleme atlandı: {exc}")

    try:
        asyncio.run(publish_message(queue_name="sync_doctor_to_es", message=es_data))
    except Exception as exc:
        print(f"[RabbitMQ] Doktor sync kuyruğuna mesaj bırakılamadı: {exc}")

    return _doctor_to_admin_item(doctor)


def delete_doctor(db: Session, doctor_id: int) -> None:
    doctor = db.execute(select(Doctor).where(Doctor.id == doctor_id)).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doktor bulunamadı.")

    user = db.execute(select(User).where(User.id == doctor.user_id)).scalar_one_or_none()
    if user:
        user.is_doctor = False
        user.wants_doctor_role = False
        user.doctor_application_status = "none"
        db.add(user)

    db.delete(doctor)
    db.commit()

    try:
        remove_doctor_document(doctor_id)
    except Exception as exc:
        print(f"[ES] Doktor indeks silme atlandı: {exc}")