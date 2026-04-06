from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lesson import Lesson
from app.models.notification import Notification
from app.models.student import Student
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationOut,
    NotificationUpdate,
)
from app.services.email_service import send_email

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    notifications = (
        db.query(Notification)
        .filter(Notification.owner_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifications


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationOut:
    # Проверяем существование студента
    student = (
        db.query(Student)
        .filter(Student.id == payload.student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Проверяем существование занятия при необходимости
    lesson = None
    if payload.lesson_id:
        lesson = (
            db.query(Lesson)
            .filter(Lesson.id == payload.lesson_id, Lesson.owner_id == current_user.id)
            .first()
        )
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

    # Создаем уведомление
    notification = Notification(
        owner_id=current_user.id,
        student_id=payload.student_id,
        lesson_id=payload.lesson_id,
        type=payload.type,
        message=payload.message,
        sent_via=payload.sent_via,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Отправляем уведомление в фоне
    _send_notification_async.delay(
        notification_id=notification.id,
        student_email=student.email,
        message=payload.message,
        sent_via=payload.sent_via,
    )

    return notification


@router.patch("/{notification_id}", response_model=NotificationOut)
def update_notification(
    notification_id: int,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationOut:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.owner_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notification, field, value)

    db.commit()
    db.refresh(notification)
    return notification


def schedule_lesson_reminder(
    db: Session,
    current_user: User,
    lesson_id: int,
    reminder_type: str = "email",
    delay_hours: int = 24,
):
    """Создает напоминание о занятии"""
    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.owner_id == current_user.id)
        .first()
    )
    if not lesson:
        return

    student = (
        db.query(Student)
        .filter(Student.id == lesson.student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student or not student.email:
        return

    message = f"Напоминание: урок с {student.name} завтра в {lesson.start_at.strftime('%H:%M')}"

    notification = Notification(
        owner_id=current_user.id,
        student_id=student.id,
        lesson_id=lesson.id,
        type="reminder",
        message=message,
        sent_via=reminder_type,
    )

    db.add(notification)
    db.commit()

    # Запланируем отправку
    _send_notification_async.apply_async(
        kwargs={
            "notification_id": notification.id,
            "student_email": student.email,
            "message": message,
            "sent_via": reminder_type,
        },
        countdown=delay_hours * 3600,
    )

@router.post("/{lesson_id}/schedule-reminder")
def schedule_lesson_reminder_api(
    lesson_id: int,
    reminder_type: str = Query("email", description="Тип уведомления: email, sms, push"),
    delay_hours: int = Query(24, ge=1, le=72, description="Задержка в часах до занятия"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Создает напоминание о занятии"""
    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.owner_id == current_user.id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    student = (
        db.query(Student)
        .filter(Student.id == lesson.student_id, Student.owner_id == current_user.id)
        .first()
    )
    if not student or not student.email:
        raise HTTPException(status_code=400, detail="Student email not found")

    message = f"Напоминание: урок с {student.name} завтра в {lesson.start_at.strftime('%H:%M')}"

    notification = Notification(
        owner_id=current_user.id,
        student_id=student.id,
        lesson_id=lesson.id,
        type="reminder",
        message=message,
        sent_via=reminder_type,
    )

    db.add(notification)
    db.commit()

    # Запланируем отправку
    from app.services.email_service import _send_notification_async
    _send_notification_async.apply_async(
        kwargs={
            "notification_id": notification.id,
            "student_email": student.email,
            "message": message,
            "sent_via": reminder_type,
        },
        countdown=delay_hours * 3600,
    )

    return {"status": "reminder_scheduled", "lesson_id": lesson_id, "delay_hours": delay_hours}
