from pydantic import BaseModel, EmailStr, Field, ConfigDict
import uuid

# 1. Ortak Özellikler (Base Schema)
# Hem kayıt olurken hem de veriyi dışarı yollarken ortak olan alanlar.
class UserBase(BaseModel):
    # EmailStr, string'in gerçekten "ornek@mail.com" formatında olup olmadığını otomatik kontrol eder.
    # Not: Bunun çalışması için 'email-validator' paketine ihtiyaç duyabiliriz.
    email: EmailStr 

# 2. Kayıt Olma Şeması (İçeri Giren Veri)
# Frontend'den `/register` endpoint'ine gönderilecek JSON bu yapıya uymak ZORUNDA.
class UserCreate(UserBase):
    # Field kullanarak şifreye katı kurallar koyuyoruz. 
    # Sadece uzunluk değil, boşluk olmaması gibi kısıtlamalar da eklenebilir.
    password: str = Field(
        min_length=6, 
        max_length=50, 
        description="Şifre en az 6, en fazla 50 karakter olmalıdır."
    )
    wants_doctor_role: bool = False
    preferred_hospital_id: int | None = None

# 3. Yanıt Şeması (Dışarı Çıkan Veri)
# Frontend'e kullanıcı verisini döndürürken ASLA şifreyi göndermeyiz.
# Veritabanındaki ID yerine, dışarıya "uid" (UUID) göndereceğiz.
class UserResponse(UserBase):
    uid: uuid.UUID
    is_active: bool
    is_doctor: bool
    is_admin: bool
    wants_doctor_role: bool
    doctor_application_status: str
    preferred_hospital_id: int | None = None

    # Pydantic v2 özelliği: from_attributes=True
    # Bu ayar çok önemli! SQLAlchemy'den gelen nesneyi (Object), 
    # otomatik olarak JSON (Sözlük) formatına çevirmesini sağlar.
    model_config = ConfigDict(from_attributes=True)


class UserListItem(UserBase):
    uid: uuid.UUID
    is_active: bool
    is_doctor: bool
    is_admin: bool
    wants_doctor_role: bool
    doctor_application_status: str
    preferred_hospital_id: int | None = None

    model_config = ConfigDict(from_attributes=True)