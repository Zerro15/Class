from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(32))  # reminder, homework_due, cancellation
    message: Mapped[str] = mapped_column(String(500))
    sent_via: Mapped[str] = mapped_column(String(16))  # email, sms, push
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    owner = relationship("User", back_populates="notifications")
    student = relationship("Student", back_populates="notifications")
    lesson = relationship("Lesson", back_populates="notifications")