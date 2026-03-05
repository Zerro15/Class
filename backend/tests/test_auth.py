<<<<<<< HEAD
from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_register_and_login(client: TestClient) -> None:
    token = register_user(client, "user1@example.com")
    assert token
    response = client.post("/api/v1/auth/login", json={"email": "user1@example.com", "password": "secret123"})
    assert response.status_code == 200
    assert response.json()["access_token"]
=======
from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_register_and_login(client: TestClient) -> None:
    token = register_user(client, "user1@example.com")
    assert token
    response = client.post("/api/v1/auth/login", json={"email": "user1@example.com", "password": "secret123"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_me_success_with_token(client: TestClient) -> None:
    token = register_user(client, "me-ok@example.com")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me-ok@example.com"
    assert isinstance(data["id"], int)


def test_me_unauthorized_without_or_invalid_token(client: TestClient) -> None:
    response_without_token = client.get("/api/v1/auth/me")
    assert response_without_token.status_code == 403

    response_invalid_token = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer definitely-invalid"}
    )
    assert response_invalid_token.status_code == 401
>>>>>>> origin/codex/implement-stable-auth-session-in-ui-559zr8
