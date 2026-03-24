import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password
from app.core.config import settings

def get_user_by_email(db: Session, email: str) -> User | None:
    """
    Veritabanında verilen e-postaya sahip bir kullanıcı olup olmadığını kontrol eder.
    SQLAlchemy 2.0 standartlarına uygun 'select' yapısı kullanılmıştır.
    """
    stmt = select(User).where(User.email == email)
    # scalar_one_or_none(): Ya tam bir obje döner ya da bulamazsa None döner.
    return db.execute(stmt).scalar_one_or_none()

def create_user(db: Session, user_in: UserCreate) -> User:
    """
    Yeni kullanıcıyı veritabanına güvenli bir şekilde kaydeder.
    """
    # 1. Pydantic şemasından gelen düz şifreyi (plain text) alıp geri döndürülemez bir hash'e çeviriyoruz.
    hashed_password = get_password_hash(user_in.password)
    
    # 2. Veritabanı modelimizi (User) oluşturuyoruz.
    # Dikkat: Şifreyi açık haliyle değil, hash'lenmiş haliyle veritabanına veriyoruz.
    wants_doctor_application = bool(user_in.wants_doctor_role or user_in.preferred_hospital_id is not None)

    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        is_email_verified=False,
        wants_doctor_role=wants_doctor_application,
        doctor_application_status="pending" if wants_doctor_application else "none",
        preferred_hospital_id=user_in.preferred_hospital_id,
        # uid kolonu model tarafında uuid4() ile otomatik dolacak, o yüzden buraya yazmıyoruz.
    )
    
    # 3. Veriyi oturuma (session) ekle ve veritabanına kalıcı olarak yaz (commit).
    db.add(db_user)
    db.commit()
    
    # 4. Veritabanından oluşan yeni ID, UID gibi otomatik alanları modele yansıtmak için refresh ediyoruz.
    db.refresh(db_user)
    
    return db_user


def _hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_email_verification_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.email_verification_token_hash = _hash_verification_token(token)
    user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return token


def get_user_by_verification_token(db: Session, token: str) -> User | None:
    token_hash = _hash_verification_token(token)
    now = datetime.now(timezone.utc)
    stmt = select(User).where(
        User.email_verification_token_hash == token_hash,
        User.email_verification_expires_at.is_not(None),
        User.email_verification_expires_at >= now,
    )
    return db.execute(stmt).scalar_one_or_none()


def mark_email_as_verified(db: Session, user: User) -> User:
    user.is_email_verified = True
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """
    Kullanıcı giriş yapmaya çalıştığında e-posta ve şifresinin doğruluğunu kontrol eder.
    """
    # 1. Önce e-posta adresiyle kullanıcıyı bul.
    user = get_user_by_email(db, email)
    
    # Eğer böyle bir e-posta yoksa işlemi durdur.
    if not user:
        return None
        
    # 2. Kullanıcı bulunduysa, formdan gelen düz şifre ile 
    # veritabanındaki hash'lenmiş şifreyi karşılaştır.
    # verify_password fonksiyonu (core/security.py içindeki) bcrypt ile bu kontrolü yapar.
    if not verify_password(password, user.hashed_password):
        return None
        
    # 3. E-posta var ve şifreler eşleşiyorsa, kullanıcıyı başarıyla döndür.
    return user

def get_user_by_uid(db: Session, uid: str) -> User | None:
    """
    Token'dan çıkan benzersiz UID ile veritabanından kullanıcıyı çeker.
    """
    stmt = select(User).where(User.uid == uid)
    return db.execute(stmt).scalar_one_or_none()


def list_users(db: Session) -> list[User]:
    stmt = select(User).order_by(User.id.asc())
    return db.execute(stmt).scalars().all()


def set_user_refresh_token(db: Session, user: User, refresh_token: str, expires_at: datetime) -> User:
    user.refresh_token_hash = get_password_hash(refresh_token)
    user.refresh_token_expires_at = expires_at
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def clear_user_refresh_token(db: Session, user: User) -> User:
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def is_valid_refresh_token(user: User, refresh_token: str) -> bool:
    if not user.refresh_token_hash or not user.refresh_token_expires_at:
        return False

    if user.refresh_token_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return False

    return verify_password(refresh_token, user.refresh_token_hash)