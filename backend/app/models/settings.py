from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    tax_percent_default: Mapped[float] = mapped_column(Float, default=0.0)
    default_lesson_duration_min: Mapped[int] = mapped_column(Integer, default=60)
    default_lesson_price: Mapped[float] = mapped_column(Float, default=0.0)
    workday_start: Mapped[str] = mapped_column(String(5), default="09:00")
    workday_end: Mapped[str] = mapped_column(String(5), default="18:00")
    week_start: Mapped[str] = mapped_column(String(16), default="monday")
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Moscow")

    owner = relationship("User", back_populates="settings")
