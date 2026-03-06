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


def test_auth_me_success(client: TestClient) -> None:
    token = register_user(client, "me-success@example.com")

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "me-success@example.com"
    assert isinstance(payload["id"], int)


def test_auth_me_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
