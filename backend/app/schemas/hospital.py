from pydantic import BaseModel
from typing import List
from pydantic import Field, ConfigDict

class ClinicCreate(BaseModel):
    name: str

class HospitalCreate(BaseModel):
    name: str
    city: str
    district: str
    clinics: List[ClinicCreate] = Field(default_factory=list)


class ClinicOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class HospitalListOut(BaseModel):
    id: int
    name: str
    city: str
    district: str
    clinics: List[ClinicOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class HospitalOut(BaseModel):
    id: int
    name: str
    city: str
    district: str
    # ... diğer alanlar
    model_config = ConfigDict(from_attributes=True)