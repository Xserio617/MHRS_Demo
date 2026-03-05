from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_doctor
from app.core.database import get_db
from app.models.user import User
from app.schemas.doctor import DoctorAdminItem, DoctorCreate, DoctorResponse, DoctorUpdate
from app.services import doctor_services

router = APIRouter()


@router.post("/", response_model=DoctorResponse)
def create_doctor(doctor_in: DoctorCreate, db: Session = Depends(get_db)):
    return doctor_services.create_doctor(db, doctor_in=doctor_in)


@router.get("/", response_model=List[DoctorAdminItem])
def list_doctors(db: Session = Depends(get_db)):
    return doctor_services.list_doctors(db)


@router.put("/{doctor_id}", response_model=DoctorAdminItem)
def update_doctor(doctor_id: int, doctor_in: DoctorUpdate, db: Session = Depends(get_db)):
    return doctor_services.update_doctor(db, doctor_id=doctor_id, doctor_in=doctor_in)


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor_services.delete_doctor(db, doctor_id=doctor_id)
    return None


@router.get("/{doctor_id}/schedule")
def get_doctor_schedule(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_doctor),
):
    return {"doctor_id": doctor_id, "schedule": []}