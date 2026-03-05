<<<<<<< HEAD
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_student_and_forbid_other(client: TestClient) -> None:
    token_a = register_user(client, "owner@example.com")
    token_b = register_user(client, "other@example.com")

    create_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token_a),
        json={"name": "Alice", "notes": "note"},
    )
    assert create_resp.status_code == 201
    student_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/students/{student_id}", headers=auth_headers(token_b))
    assert get_resp.status_code == 404


def test_create_lesson(client: TestClient) -> None:
    token = register_user(client, "lesson@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Bob", "notes": None},
    )
    student_id = student_resp.json()["id"]

    start_at = datetime.now(timezone.utc).isoformat()
    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 60,
            "status": "scheduled",
            "topic": "Math",
            "price": 20,
        },
    )
    assert lesson_resp.status_code == 201
    assert lesson_resp.json()["student_id"] == student_id


def test_dashboard_upcoming_only_current_user(client: TestClient) -> None:
    token_a = register_user(client, "dash@example.com")
    token_b = register_user(client, "dash2@example.com")

    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token_a),
        json={"name": "Dana", "notes": None},
    )
    student_id = student_resp.json()["id"]

    start_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    client.post(
        "/api/v1/lessons",
        headers=auth_headers(token_a),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 45,
            "status": "scheduled",
            "topic": "Physics",
            "price": 30,
        },
    )

    response_a = client.get("/api/v1/dashboard/upcoming", headers=auth_headers(token_a))
    response_b = client.get("/api/v1/dashboard/upcoming", headers=auth_headers(token_b))

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert len(response_a.json()["items"]) == 1
    assert len(response_b.json()["items"]) == 0


def test_payment_update(client: TestClient) -> None:
    token = register_user(client, "pay@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Eve", "notes": None},
    )
    student_id = student_resp.json()["id"]
    start_at = datetime.now(timezone.utc).isoformat()
    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 30,
            "status": "scheduled",
            "topic": None,
            "price": 10,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    pay_resp = client.patch(
        f"/api/v1/lessons/{lesson_id}/payment",
        headers=auth_headers(token),
        json={"is_paid": True, "paid_amount": 10, "paid_at": start_at},
    )
    assert pay_resp.status_code == 200
    assert pay_resp.json()["is_paid"] is True


def test_homework_update(client: TestClient) -> None:
    token = register_user(client, "hw@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Fiona", "notes": None},
    )
    student_id = student_resp.json()["id"]
    start_at = datetime.now(timezone.utc).isoformat()
    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 30,
            "status": "scheduled",
            "topic": None,
            "price": 0,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    hw_resp = client.patch(
        f"/api/v1/lessons/{lesson_id}/homework",
        headers=auth_headers(token),
        json={"text": "Read chapter 1", "link": None, "is_sent": True, "sent_at": start_at},
    )
    assert hw_resp.status_code == 200
    assert hw_resp.json()["is_sent"] is True


def test_lessons_filter_range(client: TestClient) -> None:
    token = register_user(client, "range@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Greg", "notes": None},
    )
    student_id = student_resp.json()["id"]
    now = datetime.now(timezone.utc)
    client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": (now + timedelta(days=1)).isoformat(),
            "duration_min": 30,
            "status": "scheduled",
            "topic": None,
            "price": 0,
        },
    )
    client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": (now + timedelta(days=10)).isoformat(),
            "duration_min": 30,
            "status": "scheduled",
            "topic": None,
            "price": 0,
        },
    )

    response = client.get(
        f"/api/v1/lessons?from={(now + timedelta(days=0)).isoformat()}&to={(now + timedelta(days=5)).isoformat()}",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
=======
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
>>>>>>> origin/codex/implement-stable-auth-session-in-ui-559zr8
