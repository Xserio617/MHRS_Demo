from datetime import datetime, timedelta, timezone
import jwt
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core.security import create_access_token, create_refresh_token
from app.schemas.user import UserCreate, UserResponse, UserListItem
from app.schemas.token import Token, RefreshTokenRequest
from app.services import auth_services as auth_service

router = APIRouter()

# Dependency Injection (Bağımlılık Enjeksiyonu) için tip tanımlaması
# Bu sayede her seferinde Depends(get_db) yazmak yerine DbSession kullanacağız.
DbSession = Annotated[Session, Depends(get_db)]

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: DbSession):
    # 1. E-posta adresi sistemde zaten var mı kontrol et
    user = auth_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi sistemde zaten kayıtlı."
        )
    
    # 2. Kayıt yoksa yeni kullanıcıyı oluştur
    new_user = auth_service.create_user(db, user_in=user_in)
    
    # 3. Pydantic şemamız (UserResponse) sayesinde şifre gizlenerek sadece izin verilen veriler (UID vb.) dönecek
    return new_user


@router.get("/users", response_model=list[UserListItem])
def get_users(db: DbSession):
    return auth_service.list_users(db)


@router.get("/me", response_model=UserListItem)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    # 1. Kullanıcıyı doğrula (E-posta ve düz şifreyi kontrol et)
    # Not: OAuth2PasswordRequestForm varsayılan olarak 'username' alanı bekler. 
    # Frontend'den istek atarken e-postayı 'username' alanına koyacağız.
    user = auth_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    
    # 2. Eşleşme yoksa 401 (Unauthorized) hatası fırlat
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Giriş başarılıysa JWT Access Token üret
    # Güvenlik gereği token'ın içine veritabanı ID'sini değil, benzersiz UID'yi koyuyoruz!
    access_token = create_access_token(subject=user.uid)
    refresh_token = create_refresh_token(subject=user.uid)

    refresh_exp = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    auth_service.set_user_refresh_token(db, user=user, refresh_token=refresh_token, expires_at=refresh_exp)

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
def refresh_access_token(payload: RefreshTokenRequest, db: DbSession):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token geçersiz veya süresi dolmuş",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        decoded = jwt.decode(payload.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_type = decoded.get("type")
        subject = decoded.get("sub")
        if token_type != "refresh" or not subject:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = auth_service.get_user_by_uid(db, uid=str(subject))
    if not user:
        raise credentials_exception

    if not auth_service.is_valid_refresh_token(user, payload.refresh_token):
        raise credentials_exception

    new_access_token = create_access_token(subject=user.uid)
    new_refresh_token = create_refresh_token(subject=user.uid)
    new_refresh_exp = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    auth_service.set_user_refresh_token(db, user=user, refresh_token=new_refresh_token, expires_at=new_refresh_exp)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }