import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> bool:
    """
    Отправка email через SMTP
    В production используйте SendGrid, Mailgun или аналог
    """
    settings = get_settings()

    # Настройки SMTP (для разработки - можно заменить на console output)
    smtp_server = "localhost"
    smtp_port = 1025  # MailHog или другой локальный SMTP сервер
    sender_email = "noreply@classflow.app"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = to_email

        # Текстовая версия
        text_part = MIMEText(body, "plain", "utf-8")
        msg.attach(text_part)

        # HTML версия (если предоставлена)
        if html_body:
            html_part = MIMEText(html_body, "html", "utf-8")
            msg.attach(html_part)

        # Отправка (для dev окружения просто логируем)
        if settings.environment == "production":
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.send_message(msg)
        else:
            print(f"Email would be sent to {to_email}: {subject}")

        return True

    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


# Импортируем celery_app из main.py для использования в задачах
import sys
sys.path.append('/app')


# Celery task для отправки уведозлений
# @celery_app.task
def _send_notification_async(notification_id: int, student_email: str, message: str, sent_via: str):
    """Async task for sending notifications"""
    from app.models.notification import Notification
    from app.db.session import SessionLocal
    from app.core.config import get_settings

    settings = get_settings()

    if sent_via == "email":
        subject = "ClassFlow: Напоминание о занятии"
        success = send_email(student_email, subject, message)
    elif sent_via == "sms":
        # Здесь была бы интеграция с Twilio или другим SMS API
        print(f"SMS would be sent to {student_email}: {message}")
        success = True
    else:
        # Push notification
        print(f"Push notification would be sent to {student_email}: {message}")
        success = True

    # Обновляем статус уведозления
    db = SessionLocal()
    try:
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if notification:
            notification.sent_at = datetime.utcnow()
            if success:
                notification.message += "\n\n[УСПЕШНО ОТПРАВЛЕНО]"
            else:
                notification.message += "\n\n[ОШИБКА ОТПРАВКИ]"
            db.commit()
    finally:
        db.close()
