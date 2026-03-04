from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_student(client: TestClient, token: str, name: str = "Ученик") -> int:
    response = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": name, "notes": None},
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_lesson(client: TestClient, token: str, student_id: int, start_at: str, price: float = 0) -> int:
    response = client.post(
        f"/api/v1/students/{student_id}/lessons",
        headers=auth_headers(token),
        json={
            "starts_at": start_at,
            "topic": "Алгебра",
            "notes": "",
            "duration_min": 60,
            "homework_text": "Решить 5 задач",
            "payment_amount": price,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_create_and_list_student_lessons(client: TestClient) -> None:
    token = register_user(client, "workflow-list@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat(), price=25)

    response = client.get(f"/api/v1/students/{student_id}/lessons", headers=auth_headers(token))
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == lesson_id
    assert response.json()[0]["homework"]["status"] == "assigned"


def test_reschedule_lesson(client: TestClient) -> None:
    token = register_user(client, "workflow-reschedule@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat(), price=15)
    new_start = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    response = client.post(
        f"/api/v1/lessons/{lesson_id}/reschedule",
        headers=auth_headers(token),
        json={"new_start_at": new_start, "reason": "Болеет", "notify_student": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rescheduled"


def test_completed_lesson_not_in_upcoming(client: TestClient) -> None:
    token = register_user(client, "workflow-upcoming@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(
        client,
        token,
        student_id,
        (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    )

    mark_completed = client.patch(
        f"/api/v1/lessons/{lesson_id}",
        headers=auth_headers(token),
        json={"status": "completed"},
    )
    assert mark_completed.status_code == 200

    upcoming = client.get("/api/v1/dashboard/upcoming?days=7", headers=auth_headers(token))
    assert upcoming.status_code == 200
    assert upcoming.json()["items"] == []


def test_payment_transaction_and_balance(client: TestClient) -> None:
    token = register_user(client, "workflow-payment@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat(), price=40)

    payment_response = client.post(
        "/api/v1/payments",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "lesson_id": lesson_id,
            "amount": 15,
            "method": "перевод",
            "comment": "Частичная оплата",
        },
    )
    assert payment_response.status_code == 201

    lesson_response = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth_headers(token))
    assert lesson_response.status_code == 200
    assert lesson_response.json()["payment"]["status"] == "partial"

    balance_response = client.get(f"/api/v1/students/{student_id}/balance", headers=auth_headers(token))
    assert balance_response.status_code == 200
    assert balance_response.json()["total_price"] == 40
    assert balance_response.json()["total_paid"] == 15
    assert balance_response.json()["balance"] == 25


def test_mark_homework_done_and_delete_lesson(client: TestClient) -> None:
    token = register_user(client, "workflow-homework@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat(), price=10)

    done_resp = client.post(f"/api/v1/lessons/{lesson_id}/homework/done", headers=auth_headers(token))
    assert done_resp.status_code == 200
    assert done_resp.json()["status"] == "reviewed"

    delete_resp = client.delete(f"/api/v1/lessons/{lesson_id}", headers=auth_headers(token))
    assert delete_resp.status_code == 204

    list_resp = client.get(f"/api/v1/students/{student_id}/lessons", headers=auth_headers(token))
    assert list_resp.status_code == 200
    assert list_resp.json() == []
