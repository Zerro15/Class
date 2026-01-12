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

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
