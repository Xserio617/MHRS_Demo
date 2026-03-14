from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.search.es_client import create_appointment_index, create_doctor_index, sync_all_appointments_to_es
from app.core.database import SessionLocal

# Rotalarımızı (Router) içeri aktarıyoruz
from app.api.v1 import auth, appointments, hospitals, doctors, search

@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        create_doctor_index()
        create_appointment_index()

        db = SessionLocal()
        try:
            sync_all_appointments_to_es(db)
        finally:
            db.close()
    except Exception as exc:
        print(f"[Startup] Elasticsearch index hazırlığı atlandı: {exc}")
    yield


# FastAPI uygulamasını başlat (Pydantic settings'ten proje adını alarak)
app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error_body(code: str, message: str, details=None):
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code=f"HTTP_{exc.status_code}", message=str(exc.detail)),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=_error_body(code="VALIDATION_ERROR", message="İstek verisi doğrulanamadı.", details=exc.errors()),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=_error_body(code="INTERNAL_SERVER_ERROR", message="Beklenmeyen bir hata oluştu."),
    )

@app.get("/health", tags=["Health"])
def health_check():
    """Sistemin ve Jenkins'in uygulamanın ayakta olup olmadığını kontrol edeceği uç nokta."""
    return {"status": "ok", "message": "MHRS API tıkır tıkır çalışıyor"}

# Yazdığımız API rotalarını ana uygulamaya bağlıyoruz
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(appointments.router, prefix=f"{settings.API_V1_STR}/appointments", tags=["Appointments"])
app.include_router(hospitals.router, prefix=f"{settings.API_V1_STR}/hospitals", tags=["Hospitals"])
app.include_router(doctors.router, prefix=f"{settings.API_V1_STR}/doctors", tags=["Doctors"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["Search"])