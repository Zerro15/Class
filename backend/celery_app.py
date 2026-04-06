import os
from datetime import timedelta

from celery import Celery

from app.core.config import get_settings

# Настройка окружения
# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

settings = get_settings()

celery_app = Celery(
    "classflow",
    broker=settings.redis_url or "redis://localhost:6379/0",
    backend=settings.redis_url or "redis://localhost:6379/0",
)

# Конфигурация Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60,
    task_soft_time_limit=30,
    worker_prefetch_multiplier=1,
    result_expires=3600,
)

# Дополнительные задачи
@celery_app.task
def send_lesson_reminder(lesson_id: int, student_email: str, lesson_time: str):
    """Задача для отправки напоминаний о занятиях"""
    from app.services.email_service import send_email

    # Преобразуем строку в datetime
    from datetime import datetime
    lesson_dt = datetime.fromisoformat(lesson_time.replace('Z', '+00:00'))

    subject = "ClassFlow: Напоминание о занятии"
    body = f"""
    Здравствуйте!

    Напоминаем, что у вас запланировано занятие:
    Время: {lesson_dt.strftime('%d.%m.%Y в %H:%M')}
    Спасибо!
    """

    return send_email(student_email, subject, body)