from datetime import datetime, timezone

from fastapi.testclient import TestClient


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_finance_end_to_end_flow(client: TestClient) -> None:
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "finance-flow@example.com", "password": "secret123"},
    )
    assert register.status_code == 200
    token = register.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert me.status_code == 200
    assert me.json()["email"] == "finance-flow@example.com"

    student = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Finance Student", "notes": "flow"},
    )
    assert student.status_code == 201
    student_id = student.json()["id"]

    lesson = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": datetime.now(timezone.utc).isoformat(),
            "duration_min": 60,
            "status": "scheduled",
            "topic": "Algebra",
            "price": 50,
        },
    )
    assert lesson.status_code == 201
    lesson_id = lesson.json()["id"]

    payment = client.patch(
        f"/api/v1/lessons/{lesson_id}/payment",
        headers=auth_headers(token),
        json={
            "is_paid": True,
            "paid_amount": 50,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert payment.status_code == 200

    summary = client.get("/api/v1/finance/summary", headers=auth_headers(token))
    assert summary.status_code == 200
    assert summary.json()["total_lessons"] >= 1
    assert summary.json()["total_paid"] >= 50

    balance = client.get(f"/api/v1/students/{student_id}/balance", headers=auth_headers(token))
    assert balance.status_code == 200
    assert balance.json()["balance"] == 0

    payments = client.get("/api/v1/payments", headers=auth_headers(token))
    assert payments.status_code == 200
    assert len(payments.json()) >= 1
