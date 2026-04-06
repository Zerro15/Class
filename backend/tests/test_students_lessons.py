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


def test_update_student_can_clear_notes_with_null(client: TestClient) -> None:
    token = register_user(client, "clear-notes@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Irene", "notes": "initial notes"},
    )
    student_id = student_resp.json()["id"]

    response = client.patch(
        f"/api/v1/students/{student_id}",
        headers=auth_headers(token),
        json={"notes": None},
    )

    assert response.status_code == 200
    assert response.json()["notes"] is None


def test_update_lesson_can_clear_topic_with_null(client: TestClient) -> None:
    token = register_user(client, "clear-topic@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Jack", "notes": None},
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
            "topic": "Geometry",
            "price": 50,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    response = client.patch(
        f"/api/v1/lessons/{lesson_id}",
        headers=auth_headers(token),
        json={"topic": None},
    )

    assert response.status_code == 200
    assert response.json()["topic"] is None


def test_update_payment_keeps_existing_fields_on_partial_patch(client: TestClient) -> None:
    token = register_user(client, "payment-partial@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Kate", "notes": None},
    )
    student_id = student_resp.json()["id"]
    paid_at = datetime.now(timezone.utc).isoformat()
    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": paid_at,
            "duration_min": 60,
            "status": "scheduled",
            "topic": None,
            "price": 100,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    create_resp = client.post(
        f"/api/v1/lessons/{lesson_id}/payment",
        headers=auth_headers(token),
        json={"is_paid": True, "paid_amount": 100, "paid_at": paid_at},
    )
    assert create_resp.status_code == 201

    response = client.patch(
        f"/api/v1/lessons/{lesson_id}/payment",
        headers=auth_headers(token),
        json={"is_transferred": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_paid"] is True
    assert body["paid_amount"] == 100
    assert body["paid_at"] == paid_at
    assert body["is_transferred"] is True


def test_update_homework_keeps_existing_fields_on_partial_patch(client: TestClient) -> None:
    token = register_user(client, "homework-partial@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Lena", "notes": None},
    )
    student_id = student_resp.json()["id"]
    sent_at = datetime.now(timezone.utc).isoformat()
    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": sent_at,
            "duration_min": 30,
            "status": "scheduled",
            "topic": None,
            "price": 0,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    create_resp = client.post(
        f"/api/v1/lessons/{lesson_id}/homework",
        headers=auth_headers(token),
        json={"text": "Solve 5 tasks", "link": "https://example.com/hw", "is_sent": False},
    )
    assert create_resp.status_code == 201

    response = client.patch(
        f"/api/v1/lessons/{lesson_id}/homework",
        headers=auth_headers(token),
        json={"is_sent": True, "sent_at": sent_at},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Solve 5 tasks"
    assert body["link"] == "https://example.com/hw"
    assert body["is_sent"] is True
    assert body["sent_at"] == sent_at


def test_lessons_list_rejects_invalid_date_range(client: TestClient) -> None:
    token = register_user(client, "invalid-range@example.com")
    now = datetime.now(timezone.utc)

    response = client.get(
        "/api/v1/lessons",
        params={"from": (now + timedelta(days=2)).isoformat(), "to": now.isoformat()},
        headers=auth_headers(token),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "'from' must be earlier than or equal to 'to'"


def test_lessons_list_supports_student_and_status_filters(client: TestClient) -> None:
    token = register_user(client, "lesson-filters@example.com")
    student_a_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Mira", "notes": None},
    )
    student_b_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Nora", "notes": None},
    )
    student_a_id = student_a_resp.json()["id"]
    student_b_id = student_b_resp.json()["id"]

    now = datetime.now(timezone.utc)
    create_payloads = [
        {
            "student_id": student_a_id,
            "start_at": now.isoformat(),
            "duration_min": 60,
            "status": "scheduled",
            "topic": "Algebra",
            "price": 100,
        },
        {
            "student_id": student_a_id,
            "start_at": (now + timedelta(days=1)).isoformat(),
            "duration_min": 60,
            "status": "done",
            "topic": "Geometry",
            "price": 100,
        },
        {
            "student_id": student_b_id,
            "start_at": (now + timedelta(days=2)).isoformat(),
            "duration_min": 60,
            "status": "scheduled",
            "topic": "English",
            "price": 100,
        },
    ]
    for payload in create_payloads:
        response = client.post("/api/v1/lessons", headers=auth_headers(token), json=payload)
        assert response.status_code == 201

    response = client.get(
        "/api/v1/lessons",
        params={"student_id": student_a_id, "status": "scheduled"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["student_id"] == student_a_id
    assert body[0]["status"] == "scheduled"


def test_lessons_list_rejects_invalid_status_filter(client: TestClient) -> None:
    token = register_user(client, "lesson-invalid-status@example.com")

    response = client.get(
        "/api/v1/lessons",
        params={"status": "unknown"},
        headers=auth_headers(token),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid status filter"


def test_get_lesson_contains_projection_flags(client: TestClient) -> None:
    token = register_user(client, "lesson-detail@example.com")
    student_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Olga", "notes": None},
    )
    student_id = student_resp.json()["id"]
    start_at = datetime.now(timezone.utc).isoformat()

    lesson_resp = client.post(
        "/api/v1/lessons",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "start_at": start_at,
            "duration_min": 45,
            "status": "scheduled",
            "topic": "Biology",
            "price": 90,
        },
    )
    lesson_id = lesson_resp.json()["id"]

    client.patch(
        f"/api/v1/lessons/{lesson_id}/payment",
        headers=auth_headers(token),
        json={"is_paid": True, "paid_amount": 90, "paid_at": start_at},
    )
    client.patch(
        f"/api/v1/lessons/{lesson_id}/homework",
        headers=auth_headers(token),
        json={"text": "Read notes", "link": None, "is_sent": True, "sent_at": start_at},
    )

    response = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["student_name"] == "Olga"
    assert body["is_paid"] is True
    assert body["is_homework_sent"] is True


def test_update_lesson_can_apply_changes_to_future_series_items(client: TestClient) -> None:
    token = register_user(client, "lesson-apply-future@example.com")
    student_a_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Pavel", "notes": None},
    )
    student_b_resp = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": "Rita", "notes": None},
    )
    student_a_id = student_a_resp.json()["id"]
    student_b_id = student_b_resp.json()["id"]

    series_resp = client.post(
        "/api/v1/lesson-series",
        headers=auth_headers(token),
        json={
            "student_id": student_a_id,
            "weekday": 0,
            "time_of_day": "18:00:00",
            "duration_min": 60,
            "topic": "Old topic",
            "price": 100,
            "is_active": True,
        },
    )
    assert series_resp.status_code == 201
    series_id = series_resp.json()["id"]

    apply_resp = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": "2026-03-02", "days": 14, "strategy": "skip_existing"},
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["created"] == 2

    lessons_resp = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": "2026-03-01T00:00:00+00:00", "to": "2026-03-20T00:00:00+00:00"},
    )
    assert lessons_resp.status_code == 200
    lessons = lessons_resp.json()
    assert len(lessons) == 2
    first_lesson = lessons[0]
    second_lesson = lessons[1]
    assert first_lesson["series_id"] == series_id
    assert second_lesson["series_id"] == series_id

    patch_resp = client.patch(
        f"/api/v1/lessons/{first_lesson['id']}",
        headers=auth_headers(token),
        json={
            "student_id": student_b_id,
            "start_at": "2026-03-03T19:30:00+00:00",
            "duration_min": 90,
            "topic": "New topic",
            "price": 150,
            "apply_to_future": True,
        },
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["student_id"] == student_b_id
    assert patch_resp.json()["student_name"] == "Rita"
    assert patch_resp.json()["series_id"] == series_id

    updated_lessons_resp = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": "2026-03-01T00:00:00+00:00", "to": "2026-03-20T00:00:00+00:00"},
    )
    assert updated_lessons_resp.status_code == 200
    updated_lessons = updated_lessons_resp.json()
    assert len(updated_lessons) == 2

    updated_first = next(item for item in updated_lessons if item["id"] == first_lesson["id"])
    updated_second = next(item for item in updated_lessons if item["id"] == second_lesson["id"])
    assert datetime.fromisoformat(updated_first["start_at"].replace("Z", "+00:00")) == datetime.fromisoformat(
        "2026-03-03T19:30:00+00:00"
    )
    assert datetime.fromisoformat(updated_second["start_at"].replace("Z", "+00:00")) == datetime.fromisoformat(
        "2026-03-10T19:30:00+00:00"
    )
    assert updated_second["student_id"] == student_b_id
    assert updated_second["student_name"] == "Rita"
    assert updated_second["duration_min"] == 90
    assert updated_second["topic"] == "New topic"
    assert updated_second["price"] == 150
    assert updated_second["series_id"] == series_id

    series_list_resp = client.get("/api/v1/lesson-series", headers=auth_headers(token))
    assert series_list_resp.status_code == 200
    updated_series = series_list_resp.json()[0]
    assert updated_series["student_id"] == student_b_id
    assert updated_series["weekday"] == 1
    assert updated_series["time_of_day"] == "19:30:00"
    assert updated_series["duration_min"] == 90
    assert updated_series["topic"] == "New topic"
    assert updated_series["price"] == 150
