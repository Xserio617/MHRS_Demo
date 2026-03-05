from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from app.models.hospital import Hospital, Clinic
from app.schemas.hospital import HospitalCreate, ClinicCreate

def create_hospital(db: Session, hospital_in: HospitalCreate):
    db_hospital = Hospital(
        name=hospital_in.name,
        city=hospital_in.city,
        district=hospital_in.district,
    )
    db.add(db_hospital)
    db.commit()
    db.refresh(db_hospital)
    
    # Eğer klinikler varsa onları da ekleyelim
    for clinic_data in hospital_in.clinics:
        db_clinic = Clinic(name=clinic_data.name, hospital_id=db_hospital.id)
        db.add(db_clinic)
    
    db.commit()
    return db_hospital


def list_hospitals(db: Session) -> list[Hospital]:
    stmt = select(Hospital).order_by(Hospital.id.asc())
    return db.execute(stmt).scalars().unique().all()


def add_clinic_to_hospital(db: Session, hospital_id: int, clinic_in: ClinicCreate) -> Clinic:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hastane bulunamadı.")

    db_clinic = Clinic(name=clinic_in.name, hospital_id=hospital_id)
    db.add(db_clinic)
    db.commit()
    db.refresh(db_clinic)
    return db_clinic