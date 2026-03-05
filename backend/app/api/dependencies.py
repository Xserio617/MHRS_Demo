from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from app.services import auth_services as auth_service

# FastAPI'ye login endpointimizin adresini söylüyoruz. 
# Swagger UI bu sayede "Authorize" butonunu otomatik çalıştırabilir.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], 
    db: Annotated[Session, Depends(get_db)]
) -> User:
    """
    Korumalı endpoint'lere gelen isteklerdeki JWT token'ı doğrular 
    ve işlemi yapan mevcut kullanıcı nesnesini (User) döndürür.
    """
    # Herhangi bir hata durumunda fırlatacağımız standart 401 hatası
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulama bilgileri geçersiz veya süresi dolmuş",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. PyJWT ile token'ı çöz (decode)
        # Eğer token'ın süresi (exp) dolmuşsa veya gizli anahtar (SECRET_KEY) yanlışsa 
        # burası otomatik olarak hata fırlatır.
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # 2. Çıkan veriyi Pydantic şemasına oturt
        # Payload içindeki 'sub' (yani uid) değerini alıyoruz.
        token_data = TokenPayload(sub=str(payload.get("sub")))
        
        if token_data.sub is None:
            raise credentials_exception
            
    except (jwt.InvalidTokenError, ValidationError):
        # Token bozuksa, süresi geçmişse veya Pydantic validasyonu çökerse
        raise credentials_exception
        
    # 3. Elde edilen UID ile veritabanından kullanıcıyı bul
    user = auth_service.get_user_by_uid(db, uid=token_data.sub)
    
    if user is None:
        raise credentials_exception
        
    return user

def get_current_doctor(
    # Önce standart doğrulamadan (JWT ve UID kontrolü) geçmesini sağlıyoruz
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Sadece doktor yetkisine sahip kullanıcıların geçmesine izin verir.
    """
    # Eğer giriş yapan kullanıcının is_doctor alanı False ise, kapıdan çevir!
    if not current_user.is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # 401 değil, 403 (Yasak)
            detail="Bu işlemi yapmak için doktor yetkiniz bulunmamaktadır."
        )
    return current_user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı hesabı aktif değil."
        )
    return current_user


def get_current_admin(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi yapmak için yönetici yetkiniz bulunmamaktadır."
        )
    return current_user