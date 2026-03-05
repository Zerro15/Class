from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LessonSeries(Base):
    __tablename__ = "lesson_series"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    time_of_day: Mapped[time] = mapped_column()
    duration_min: Mapped[int] = mapped_column(Integer)
    topic: Mapped[str | None] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    owner = relationship("User")
    student = relationship("Student")
    lessons = relationship("Lesson", back_populates="series")
