from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_student(client: TestClient, token: str, name: str = "Student") -> int:
    response = client.post(
        "/api/v1/students",
        headers=auth_headers(token),
        json={"name": name, "notes": None},
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_series(client: TestClient, token: str, student_id: int, weekday: int, time_of_day: str) -> int:
    response = client.post(
        "/api/v1/lesson-series",
        headers=auth_headers(token),
        json={
            "student_id": student_id,
            "weekday": weekday,
            "time_of_day": time_of_day,
            "duration_min": 60,
            "price": 1200,
            "topic": "Math",
            "is_active": True,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_create_series(client: TestClient) -> None:
    token = register_user(client, "series-create@example.com")
    student_id = create_student(client, token)
    series_id = create_series(client, token, student_id, 0, "18:00:00")
    assert series_id > 0


def test_apply_schedule_skip_duplicates(client: TestClient) -> None:
    token = register_user(client, "series-apply@example.com")
    student_id = create_student(client, token)
    create_series(client, token, student_id, 0, "18:00:00")

    first = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": "2026-03-02", "days": 7, "strategy": "skip_existing"},
    )
    second = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": "2026-03-02", "days": 7, "strategy": "skip_existing"},
    )

    assert first.status_code == 200
    assert first.json()["created"] == 1
    assert second.status_code == 200
    assert second.json()["created"] == 0
    assert second.json()["skipped"] == 1


def test_apply_series_patch_future_only(client: TestClient) -> None:
    token = register_user(client, "series-patch@example.com")
    student_id = create_student(client, token)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    future_hour = (now + timedelta(hours=1)).strftime("%H:%M:%S")
    series_id = create_series(client, token, student_id, now.weekday(), future_hour)

    apply_resp = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": (now.date() - timedelta(days=7)).isoformat(), "days": 14},
    )
    assert apply_resp.status_code == 200

    lessons = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": (now - timedelta(days=8)).isoformat(), "to": (now + timedelta(days=2)).isoformat()},
    ).json()
    assert len(lessons) >= 2

    patch_resp = client.patch(
        f"/api/v1/lesson-series/{series_id}/apply",
        headers=auth_headers(token),
        json={
            "from_start_at": now.isoformat(),
            "patch": {"duration_min": 90, "topic": "New", "price": 1500},
            "also_update_series_template": True,
        },
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["updated_lessons"] >= 1

    updated = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": (now - timedelta(days=8)).isoformat(), "to": (now + timedelta(days=2)).isoformat()},
    ).json()
    past = [item for item in updated if datetime.fromisoformat(item["start_at"].replace("Z", "+00:00")) < now]
    future = [item for item in updated if datetime.fromisoformat(item["start_at"].replace("Z", "+00:00")) >= now]
    assert past and future
    assert all(item["duration_min"] == 60 for item in past)
    assert all(item["duration_min"] == 90 for item in future)


def test_delete_series_detaches_existing_lessons(client: TestClient) -> None:
    token = register_user(client, "series-delete@example.com")
    student_id = create_student(client, token)
    series_id = create_series(client, token, student_id, 0, "18:00:00")

    apply_resp = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": "2026-03-02", "days": 14, "strategy": "skip_existing"},
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["created"] == 2

    delete_resp = client.delete(
        f"/api/v1/lesson-series/{series_id}",
        headers=auth_headers(token),
    )
    assert delete_resp.status_code == 204

    lessons_resp = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": "2026-03-01T00:00:00+00:00", "to": "2026-03-20T00:00:00+00:00"},
    )
    assert lessons_resp.status_code == 200
    lessons = lessons_resp.json()
    assert len(lessons) == 2
    assert all(item["series_id"] is None for item in lessons)
    assert all(item["status"] == "scheduled" for item in lessons)


def test_delete_series_can_cancel_future_lessons(client: TestClient) -> None:
    token = register_user(client, "series-delete-cancel@example.com")
    student_id = create_student(client, token)
    series_id = create_series(client, token, student_id, 4, "18:00:00")

    apply_resp = client.post(
        "/api/v1/schedule/apply",
        headers=auth_headers(token),
        json={"week_start": "2099-01-05", "days": 14, "strategy": "skip_existing"},
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["created"] == 2

    delete_resp = client.delete(
        f"/api/v1/lesson-series/{series_id}",
        headers=auth_headers(token),
        params={"future_action": "cancel"},
    )
    assert delete_resp.status_code == 204

    lessons_resp = client.get(
        "/api/v1/lessons",
        headers=auth_headers(token),
        params={"from": "2099-01-01T00:00:00+00:00", "to": "2099-01-31T00:00:00+00:00"},
    )
    assert lessons_resp.status_code == 200
    lessons = lessons_resp.json()
    assert len(lessons) == 2
    assert all(item["series_id"] is None for item in lessons)
    assert all(item["status"] == "canceled" for item in lessons)
