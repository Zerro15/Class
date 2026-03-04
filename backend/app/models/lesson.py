from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_min: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32))
    topic: Mapped[str | None] = mapped_column(String(255))
    # Заметки к занятию храним отдельно от темы: это свободный текст для преподавателя.
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    tax_percent: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    owner = relationship("User", back_populates="lessons")
    student = relationship("Student", back_populates="lessons")
    payment = relationship("Payment", back_populates="lesson", uselist=False)
    homework = relationship("Homework", back_populates="lesson", uselist=False)
    # История переносов помогает понять, почему дата занятия изменилась.
    reschedules = relationship("LessonReschedule", back_populates="lesson", cascade="all, delete")
