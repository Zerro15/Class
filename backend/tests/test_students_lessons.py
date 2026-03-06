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
        "/api/v1/lessons",
        params={"from": (now + timedelta(days=0)).isoformat(), "to": (now + timedelta(days=5)).isoformat()},
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_lessons_list_contains_student_projection(client: TestClient) -> None:
    token = register_user(client, "calendar-projection@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Helen", "notes": None},
    )
    student_id = student_resp.json()["id"]

    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": datetime.now(timezone.utc).isoformat(),
            "duration_min": 45,
            "status": "scheduled",
            "topic": "English",
            "price": 25,
        },
    )
    assert lesson_resp.status_code == 201

    response = client.get("/api/v1/lessons", headers=auth_headers(token))
    assert response.status_code == 200
    assert response.json()[0]["student_name"] == "Helen"


def test_settings_get_and_update(client: TestClient) -> None:
    token = register_user(client, "settings@example.com")

    get_resp = client.get("/api/v1/settings", headers=auth_headers(token))
    assert get_resp.status_code == 200
    assert get_resp.json()["default_lesson_duration_min"] == 60

    update_resp = client.put(
        "/api/v1/settings",
        headers=auth_headers(token),
        json={
            "default_lesson_duration_min": 90,
            "default_lesson_price": 3200,
            "workday_start": "10:00",
            "workday_end": "20:00",
            "week_start": "sunday",
            "timezone": "Europe/Berlin",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["default_lesson_duration_min"] == 90
