from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.hospital import Clinic

router = APIRouter()


@router.get("/doctors")
def search_doctors(q: str = Query(..., min_length=1, description="Doktor/branş/hastane arama metni")):
    try:
        from app.search.es_client import search_doctors_in_es
        results = search_doctors_in_es(q)
        return {"query": q, "count": len(results), "items": results}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Elasticsearch servisi kullanılamıyor: {exc}")


@router.get("/available-doctors")
def search_available_doctors(
    q: str = Query(..., min_length=1, description="Doktor/branş/hastane arama metni"),
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    hospital_id: int | None = Query(default=None),
    clinic: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Tarih formatı geçersiz. YYYY-MM-DD olmalı.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="Başlangıç tarihi bitiş tarihinden büyük olamaz.")

    try:
        from app.search.es_client import search_doctors_in_es
        results = search_doctors_in_es(q)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Elasticsearch servisi kullanılamıyor: {exc}")

    doctor_ids = [item.get("doctor_id") for item in results if item.get("doctor_id") is not None]
    if not doctor_ids:
        return {
            "query": q,
            "start_date": start_date,
            "end_date": end_date,
            "count": 0,
            "items": [],
        }

    if hospital_id is not None:
        stmt_hospital_doctors = (
            select(Doctor.id)
            .join(Clinic, Clinic.id == Doctor.clinic_id)
            .where(Clinic.hospital_id == hospital_id, Doctor.id.in_(doctor_ids))
        )
        allowed_ids = set(db.execute(stmt_hospital_doctors).scalars().all())
        doctor_ids = [doctor_id for doctor_id in doctor_ids if doctor_id in allowed_ids]

    if clinic:
        lowered_clinic = clinic.strip().lower()
        results = [
            item for item in results
            if any(lowered_clinic in clinic_name.lower() for clinic_name in item.get("clinics", []))
        ]
        result_ids = {item.get("doctor_id") for item in results}
        doctor_ids = [doctor_id for doctor_id in doctor_ids if doctor_id in result_ids]

    if not doctor_ids:
        return {
            "query": q,
            "start_date": start_date,
            "end_date": end_date,
            "count": 0,
            "items": [],
        }

    end_dt_inclusive = datetime(end_dt.year, end_dt.month, end_dt.day, 23, 59, 59)
    stmt_busy = select(Appointment.doctor_id).where(
        and_(
            Appointment.doctor_id.in_(doctor_ids),
            Appointment.status == AppointmentStatus.ACTIVE,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt_inclusive,
        )
    )
    busy_doctor_ids = set(db.execute(stmt_busy).scalars().all())

    filtered_items = [
        item for item in results
        if item.get("doctor_id") in doctor_ids and item.get("doctor_id") not in busy_doctor_ids
    ]

    return {
        "query": q,
        "start_date": start_date,
        "end_date": end_date,
        "count": len(filtered_items),
        "items": filtered_items,
    }
