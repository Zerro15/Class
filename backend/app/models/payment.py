from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), unique=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_transferred: Mapped[bool] = mapped_column(Boolean, default=False)
    transferred_amount: Mapped[float] = mapped_column(Float, default=0.0)
    transferred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    lesson = relationship("Lesson", back_populates="payment")
