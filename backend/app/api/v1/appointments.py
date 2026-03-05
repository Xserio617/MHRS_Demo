from datetime import date
from typing import Annotated, List
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user, get_current_doctor
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.services import appointment_service
from app.tasks.rabbitmq import publish_message

router = APIRouter()

# Sık kullanılan bağımlılıkları (Dependency) temiz bir şekilde tanımlayalım
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentDoctor = Annotated[User, Depends(get_current_doctor)]


@router.get("/doctor/{doctor_id}/busy-slots")
def get_doctor_busy_slots(
    doctor_id: int,
    db: DbSession,
    date_value: date = Query(alias="date"),
):
    busy_slots = appointment_service.get_doctor_busy_times_for_date(
        db=db,
        doctor_id=doctor_id,
        target_date=date_value,
    )
    return {
        "doctor_id": doctor_id,
        "date": date_value.isoformat(),
        "busy_slots": busy_slots,
    }

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_appointment(
    appointment_in: AppointmentCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Giriş yapmış hasta için yeni bir randevu oluşturur ve RabbitMQ'ya bildirim görevi atar.
    """
    # 1. İş mantığını (Service) çağır ve randevuyu MariaDB'ye kaydet
    # Dikkat: current_user.id'yi token'dan güvenli bir şekilde aldık.
    new_appointment = appointment_service.create_appointment(
        db=db, 
        patient_id=current_user.id, 
        appointment_in=appointment_in
    )
    
    # 2. Asenkron Bildirim (RabbitMQ)
    # Randevu başarıyla alındıysa, hastaya e-posta/SMS gitmesi için kuyruğa mesaj bırak.
    # Tarihi ISO formatına çeviriyoruz ki JSON'da sorun çıkmasın.
    notification_payload = {
        "patient_email": current_user.email,
        "doctor_id": appointment_in.doctor_id,
        "appointment_date": new_appointment.appointment_date.isoformat(),
        "status": "CREATED"
    }
    
    # await kullandığımız için FastAPI ana thread'i bloke etmeden mesajı fırlatır ve devam eder.
    await publish_message(queue_name="send_appointment_notification", message=notification_payload)
    
    return new_appointment


@router.get("/me", response_model=List[AppointmentResponse])
def get_my_appointments(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Giriş yapmış hastanın kendi aktif ve geçmiş randevularını listeler.
    """
    # Bu fonksiyonu service katmanında yazdığımızı varsayıyoruz
    # Sadece current_user.id'ye ait randevuları getirecek bir SELECT sorgusudur.
    appointments = appointment_service.get_patient_appointments(db, patient_id=current_user.id)
    return appointments


@router.get("/doctor/me", response_model=List[AppointmentResponse])
def get_my_doctor_appointments(
    current_doctor: CurrentDoctor,
    db: DbSession,
):
    appointments = appointment_service.get_doctor_appointments_by_user_id(db, user_id=current_doctor.id)
    return appointments


@router.delete("/{appointment_uid}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_uid: str,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Kullanıcının kendi randevusunu iptal etmesini sağlar.
    """
    # 1. Randevuyu bul ve bu randevunun gerçekten bu hastaya ait olduğunu doğrula!
    appointment = appointment_service.get_appointment_by_uid(db, uid=appointment_uid)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı.")
        
    if appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece kendi randevularınızı iptal edebilirsiniz.")
        
    # 2. Durumunu CANCELLED (İptal) olarak güncelle
    appointment_service.cancel_appointment(db, appointment)
    
    # 3. İptal bilgisini RabbitMQ'ya gönder (Doktora ve hastaya iptal maili atılabilir)
    cancel_payload = {
        "appointment_uid": appointment_uid,
        "patient_email": current_user.email,
        "status": "CANCELLED"
    }
    await publish_message(queue_name="send_appointment_notification", message=cancel_payload)
    
    return None