from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_lesson(client: TestClient, token: str, email_prefix: str, start_at: str, price: float) -> int:
    student = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": f"{email_prefix} Student", "notes": "finance"},
    )
    student_id = student.json()["id"]
    lesson = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 60,
            "status": "scheduled",
            "topic": "Алгебра",
            "price": price,
        },
    )
    assert lesson.status_code == 201
    return lesson.json()["id"]


def test_finance_summary_and_items(client: TestClient) -> None:
    token = register_user(client, "finance@example.com")
    now = datetime.now(timezone.utc)

    paid_lesson_id = create_lesson(client, token, "paid", (now + timedelta(days=1)).isoformat(), 100)
    unpaid_lesson_id = create_lesson(client, token, "unpaid", (now + timedelta(days=2)).isoformat(), 80)

    pay_resp = client.patch(
        f"/api/v1/lessons/{paid_lesson_id}/payment",
        headers=auth_headers(token),
        json={
            "is_paid": True,
            "paid_amount": 100,
            "paid_at": now.isoformat(),
            "is_transferred": True,
            "transferred_amount": 95,
            "transferred_at": now.isoformat(),
        },
    )
    assert pay_resp.status_code == 200

    summary_resp = client.get("/api/v1/finance/summary", headers=auth_headers(token))
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["income_paid"] == 100
    assert summary["debt_unpaid"] == 80
    assert summary["transferred_sum"] == 95
    assert summary["not_transferred_sum"] == 0
    assert summary["lessons_count"] == 2

    items_resp = client.get("/api/v1/finance/items", headers=auth_headers(token))
    assert items_resp.status_code == 200
    items = items_resp.json()["items"]
    assert len(items) == 2
    paid_item = next(item for item in items if item["lesson_id"] == paid_lesson_id)
    assert paid_item["is_paid"] is True
    assert paid_item["is_transferred"] is True

    archive_resp = client.patch(
        f"/api/v1/lessons/{unpaid_lesson_id}",
        headers=auth_headers(token),
        json={"is_archived": True},
    )
    assert archive_resp.status_code == 200

    archived_only = client.get(
        "/api/v1/finance/items",
        headers=auth_headers(token),
        params={"archived": True},
    )
    assert archived_only.status_code == 200
    archived_items = archived_only.json()["items"]
    assert len(archived_items) == 1
    assert archived_items[0]["lesson_id"] == unpaid_lesson_id
