from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LessonSeries(Base):
    __tablename__ = "lesson_series"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[time] = mapped_column(Time)
    duration_min: Mapped[int] = mapped_column(Integer)
    topic: Mapped[str | None] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Float, default=0.0)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    owner = relationship("User", back_populates="lesson_series")
    student = relationship("Student", back_populates="lesson_series")
    lessons = relationship("Lesson", back_populates="series")
