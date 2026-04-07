from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
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

    # Для email-уведомлений нужен контакт (в текущей модели используем name как fallback для SMS/push)
    contact_info = None
    if payload.sent_via == "email":
        # У студента пока нет email поля, используем placeholder
        contact_info = f"student_{student.id}@example.com"
    else:
        # Для SMS/push используем имя студента как контакт
        contact_info = student.name

    # Отправляем уведомление синхронно (так как _send_notification_async не Celery task)
    _send_notification_async(
        notification_id=notification.id,
        student_email=contact_info,
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
    if not student:
        return

    # Для email-уведомлений нужен контакт (в текущей модели используем name как fallback для SMS/push)
    contact_info = None
    if reminder_type == "email":
        # У студента пока нет email поля, используем placeholder
        contact_info = f"student_{student.id}@example.com"
    else:
        # Для SMS/push используем имя студента как контакт
        contact_info = student.name

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

    # Отправляем уведомление синхронно (так как _send_notification_async не Celery task)
    _send_notification_async(
        notification_id=notification.id,
        student_email=contact_info,
        message=message,
        sent_via=reminder_type,
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
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Для email-уведомлений нужен контакт (в текущей модели используем name как fallback для SMS/push)
    contact_info = None
    if reminder_type == "email":
        # У студента пока нет email поля, используем placeholder
        contact_info = f"student_{student.id}@example.com"
    else:
        # Для SMS/push используем имя студента как контакт
        contact_info = student.name

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

    # Отправляем уведомление (синхронно, так как _send_notification_async не Celery task)
    from app.services.email_service import _send_notification_async
    _send_notification_async(
        notification_id=notification.id,
        student_email=contact_info,
        message=message,
        sent_via=reminder_type,
    )

    return {"status": "reminder_scheduled", "lesson_id": lesson_id, "delay_hours": delay_hours}
