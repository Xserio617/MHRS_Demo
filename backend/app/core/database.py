from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# 1. Engine Oluşturma
# settings.SQLALCHEMY_DATABASE_URI, config.py dosyamızda ürettiğimiz MariaDB bağlantı linkidir.
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

# 2. Session Fabrikası Oluşturma
# autocommit=False ve autoflush=False diyerek veritabanına yazma kontrolünü 
# tamamen kendi elimizde (manuel) tutuyoruz. İstemeden veri kaydedilmesini önler.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Temel Sınıf (Base)
# Tüm modellerimiz bu sınıftan miras alacak.
class Base(DeclarativeBase):
    pass

# 4. Dependency Injection için Veritabanı Oturumu Sağlayıcı
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()