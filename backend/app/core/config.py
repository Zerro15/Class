from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = Field(..., alias="DATABASE_URL")
    frontend_origin: str = Field("http://localhost:3000", alias="FRONTEND_ORIGIN")
    tax_percent_default: float = Field(0.0, alias="TAX_PERCENT_DEFAULT")
    login_rate_limit_attempts: int = Field(5, alias="LOGIN_RATE_LIMIT_ATTEMPTS")
    login_rate_limit_window_seconds: int = Field(60, alias="LOGIN_RATE_LIMIT_WINDOW_SECONDS")
    # Консервативно: неявка по умолчанию не начисляется, пока репетитор явно не включит политику.
    charge_on_no_show: bool = Field(False, alias="CHARGE_ON_NO_SHOW")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
