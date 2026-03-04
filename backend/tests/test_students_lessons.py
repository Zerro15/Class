from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_student(client: TestClient, token: str, name: str = "Ученик", rate: float = 1200) -> int:
    response = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": name, "notes": "заметки", "price_per_hour": rate},
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_lesson(client: TestClient, token: str, student_id: int, start_at: str, payment_amount: float | None = None) -> int:
    payload = {
        "starts_at": start_at,
        "topic": "Алгебра",
        "notes": "",
        "duration_min": 60,
        "homework_text": "Решить 5 задач",
    }
    if payment_amount is not None:
        payload["payment_amount"] = payment_amount
    response = client.post(
        f"/api/v1/students/{student_id}/lessons",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_create_lesson_uses_student_rate_when_price_missing(client: TestClient) -> None:
    token = register_user(client, "rate@example.com")
    student_id = create_student(client, token, rate=1800)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat())

    lesson_resp = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth_headers(token))
    assert lesson_resp.status_code == 200
    assert lesson_resp.json()["price"] == 1800


def test_reschedule_and_upcoming_completed_filter(client: TestClient) -> None:
    token = register_user(client, "flow@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(), 1000)

    reschedule = client.post(
        f"/api/v1/lessons/{lesson_id}/reschedule",
        headers=auth_headers(token),
        json={"new_start_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(), "reason": "болеет", "notify_student": True},
    )
    assert reschedule.status_code == 200
    assert reschedule.json()["status"] == "rescheduled"

    done = client.patch(
        f"/api/v1/lessons/{lesson_id}",
        headers=auth_headers(token),
        json={"status": "completed"},
    )
    assert done.status_code == 200

    upcoming = client.get("/api/v1/dashboard/upcoming?days=7", headers=auth_headers(token))
    assert upcoming.status_code == 200
    assert upcoming.json()["items"] == []


def test_partial_payment_updates_lesson_and_balance(client: TestClient) -> None:
    token = register_user(client, "money@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, datetime.now(timezone.utc).isoformat(), 2000)

    mark_completed = client.patch(
        f"/api/v1/lessons/{lesson_id}",
        headers=auth_headers(token),
        json={"status": "completed"},
    )
    assert mark_completed.status_code == 200

    tx = client.post(
        "/api/v1/payments",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "lesson_id": lesson_id,
            "amount": 500,
            "method": "перевод",
            "comment": "аванс",
        },
    )
    assert tx.status_code == 201

    lesson_resp = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth_headers(token))
    assert lesson_resp.status_code == 200
    assert lesson_resp.json()["payment"]["status"] == "partial"

    balance_resp = client.get(f"/api/v1/students/{student_id}/balance", headers=auth_headers(token))
    assert balance_resp.status_code == 200
    assert balance_resp.json()["charged_total"] == 2000
    assert balance_resp.json()["paid_total"] == 500
    assert balance_resp.json()["debt"] == 1500


def test_dashboard_summary_and_finance_summary(client: TestClient) -> None:
    token = register_user(client, "summary@example.com")
    student_id = create_student(client, token)
    lesson_id = create_lesson(client, token, student_id, (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), 1000)

    client.post(
        "/api/v1/payments",
        headers=auth_headers(token),
        json={"student_id": student_id, "lesson_id": lesson_id, "amount": 300, "method": "наличные"},
    )

    summary = client.get("/api/v1/dashboard/summary", headers=auth_headers(token))
    assert summary.status_code == 200
    assert summary.json()["upcoming_count"] >= 1
    assert summary.json()["unpaid_total"] >= 700

    month = datetime.now(timezone.utc).strftime("%Y-%m")
    finance = client.get(f"/api/v1/finance/summary?month={month}", headers=auth_headers(token))
    assert finance.status_code == 200
    assert finance.json()["income_month"] >= 300
    assert len(finance.json()["payments"]) >= 1


def test_soft_delete_restore_and_search(client: TestClient) -> None:
    token = register_user(client, "soft@example.com")
    student_id = create_student(client, token, name="Анна Иванова")

    delete_resp = client.delete(f"/api/v1/students/{student_id}", headers=auth_headers(token))
    assert delete_resp.status_code == 204

    active_list = client.get("/api/v1/students", headers=auth_headers(token))
    assert active_list.status_code == 200
    assert all(item["is_active"] for item in active_list.json())

    all_list = client.get("/api/v1/students?include_inactive=true", headers=auth_headers(token))
    assert all_list.status_code == 200
    assert any(item["id"] == student_id and item["is_active"] is False for item in all_list.json())

    search = client.get("/api/v1/students?q=Анна&include_inactive=true", headers=auth_headers(token))
    assert search.status_code == 200
    assert len(search.json()) == 1

    restore = client.post(f"/api/v1/students/{student_id}/restore", headers=auth_headers(token))
    assert restore.status_code == 200
    assert restore.json()["is_active"] is True
