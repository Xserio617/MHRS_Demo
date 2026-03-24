from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "MHRS API"
    API_V1_STR: str = "/api/v1"

    # JWT Security Ayarları
    SECRET_KEY: str = "change-this-secret-key-at-least-32-bytes" # Prod ortamında .env'den gelecek
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 15
    EMAIL_VERIFICATION_REQUIRED: bool = True

    # MariaDB Ayarları
    MARIADB_USER: str = "root"
    MARIADB_PASSWORD: str = "password"
    MARIADB_HOST: str = "localhost"
    MARIADB_PORT: int = 3306
    MARIADB_DB: str = "mhrs_db"

    # Pydantic v2 computed_field ile dinamik DB URL oluşturma
    @computed_field
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"mysql+pymysql://{self.MARIADB_USER}:{self.MARIADB_PASSWORD}@{self.MARIADB_HOST}:{self.MARIADB_PORT}/{self.MARIADB_DB}"

    # Elasticsearch ve RabbitMQ
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    BACKEND_CORS_ORIGINS: str = "http://127.0.0.1:5173,http://localhost:5173"
    FRONTEND_BASE_URL: str = "http://127.0.0.1:5173"

    # Brevo (SMTP/API yerine HTTP API ile gönderim)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "MHRS"

    @computed_field
    def CORS_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_security_settings(self):
        if self.ALGORITHM.startswith("HS") and len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY en az 32 karakter olmalıdır (HS256/HS384/HS512 için).")
        return self

    # Pydantic v2 Config yapısı
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()