from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, field_validator
import uuid

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime

    @field_validator("appointment_date")
    @classmethod
    def check_date_not_in_past(cls, v: datetime) -> datetime:
        # Pydantic v2'de validasyonlar classmethod olarak tanımlanır
        # Eğer gelen tarih şu anki zamandan küçükse anında hata fırlat
        
        # Zaman dilimi (timezone) farklılıklarını önlemek için UTC bazlı kontrol
        now = datetime.now(timezone.utc)
        
        # Eğer gelen veride timezone bilgisi yoksa (naive), onu UTC farz et
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
            
        if v < now:
            raise ValueError("Geçmiş bir tarihe randevu alınamaz.")
            
        # Randevular tam saatlerde veya 15 dakikalık periyotlarda alınabilir kuralı eklenebilir
        if v.minute not in (0, 15, 30, 45):
            raise ValueError("Randevular sadece 15 dakikalık dilimler halinde alınabilir.")
            
        return v

class AppointmentResponse(BaseModel):
    uid: uuid.UUID
    doctor_id: int
    appointment_date: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)