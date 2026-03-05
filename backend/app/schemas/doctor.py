import uuid
from typing import List, Literal
from pydantic import BaseModel, ConfigDict, field_validator

DoctorType = Literal["tam", "nobetci"]


def _validate_hour(value: str) -> str:
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError("Saat formatı HH:MM olmalıdır.")
    hour, minute = parts
    if not hour.isdigit() or not minute.isdigit():
        raise ValueError("Saat formatı HH:MM olmalıdır.")
    hour_value = int(hour)
    minute_value = int(minute)
    if hour_value < 0 or hour_value > 23 or minute_value < 0 or minute_value > 59:
        raise ValueError("Saat değeri geçersiz.")
    return f"{hour_value:02d}:{minute_value:02d}"

class DoctorCreate(BaseModel):
    user_uid: uuid.UUID  # Frontend bize güvenlik gereği DB ID'si değil, UID gönderecek
    clinic_ids: List[int] # Doktorun atanacağı kliniklerin ID'leri
    first_name: str
    last_name: str
    title: str
    doctor_type: DoctorType = "tam"
    shift_start: str = "08:30"
    shift_end: str = "17:00"

    @field_validator("shift_start", "shift_end")
    @classmethod
    def validate_hour(cls, value: str) -> str:
        return _validate_hour(value)

class DoctorResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    title: str
    doctor_type: DoctorType
    shift_start: str
    shift_end: str
    
    # SQLAlchemy objesini JSON'a çevirmek için
    model_config = ConfigDict(from_attributes=True)


class DoctorUpdate(BaseModel):
    first_name: str
    last_name: str
    title: str
    clinic_id: int
    doctor_type: DoctorType
    shift_start: str
    shift_end: str

    @field_validator("shift_start", "shift_end")
    @classmethod
    def validate_hour(cls, value: str) -> str:
        return _validate_hour(value)


class DoctorAdminItem(BaseModel):
    id: int
    user_uid: str
    user_email: str
    first_name: str
    last_name: str
    title: str
    hospital_name: str
    clinic_id: int
    clinic_name: str
    doctor_type: DoctorType
    shift_start: str
    shift_end: str