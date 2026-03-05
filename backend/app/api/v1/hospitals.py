from app.schemas.hospital import HospitalCreate, HospitalListOut, ClinicCreate, ClinicOut
from app.services import hospital_services
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
# Buraya şemalarını (schemas) da eklememiz gerekecek

router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_hospital(hospital_in: HospitalCreate, db: Session = Depends(get_db)):
    return hospital_services.create_hospital(db, hospital_in=hospital_in)

@router.get("/", response_model=list[HospitalListOut])
def list_hospitals(db: Session = Depends(get_db)):
    return hospital_services.list_hospitals(db)


@router.post("/{hospital_id}/clinics", response_model=ClinicOut, status_code=status.HTTP_201_CREATED)
def add_clinic(hospital_id: int, clinic_in: ClinicCreate, db: Session = Depends(get_db)):
    return hospital_services.add_clinic_to_hospital(db, hospital_id=hospital_id, clinic_in=clinic_in)