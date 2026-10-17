import base64
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Tiketa 2.0"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str
    REDIS_URL: str

    SECRET_KEY: str = Field(min_length=32)
    APP_FIELD_ENCRYPTION_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    BUSINESS_TIMEZONE: str = "Asia/Manila"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_STARTTLS: bool = False
    MAIL_FROM: str = "tiketa@localhost"
    PUBLIC_BASE_URL: str = "http://localhost:5173"
    MAX_ATTACHMENT_BYTES: int = 5 * 1024 * 1024

    @model_validator(mode="after")
    def validate_security(self):
        try:
            key = base64.b64decode(self.APP_FIELD_ENCRYPTION_KEY, validate=True)
        except ValueError as exc:
            raise ValueError("APP_FIELD_ENCRYPTION_KEY must be base64") from exc
        if len(key) != 32:
            raise ValueError("APP_FIELD_ENCRYPTION_KEY must decode to 32 bytes")
        if self.ENVIRONMENT == "production":
            if not self.PUBLIC_BASE_URL.startswith("https://"):
                raise ValueError("Production PUBLIC_BASE_URL requires HTTPS")
            if not self.SMTP_STARTTLS:
                raise ValueError("Production mail requires STARTTLS")
        return self

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
