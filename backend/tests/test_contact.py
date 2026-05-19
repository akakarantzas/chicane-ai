from app.routers import contact


class FakeResendResponse:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return b"{}"


def test_contact_invalid_email(client):
    response = client.post(
        "/api/contact",
        json={"name": "Test", "email": "not-an-email", "message": "Hello"},
    )

    assert response.status_code == 422


def test_contact_empty_message(client):
    response = client.post(
        "/api/contact",
        json={"name": "Test", "email": "test@example.com", "message": "   "},
    )

    assert response.status_code == 422


def test_contact_missing_env_vars_do_not_break_app_startup():
    from app.main import app

    assert app.title == "Chicane.ai API"


def test_contact_missing_env_vars_return_controlled_response(client, monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("CONTACT_EMAIL", raising=False)

    response = client.post(
        "/api/contact",
        json={"name": "Test", "email": "test@example.com", "message": "Hello"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Email service not configured."


def test_contact_placeholder_env_vars_are_configuration_error(client, monkeypatch):
    calls = []
    monkeypatch.setenv("RESEND_API_KEY", "re_placeholder_replace_me")
    monkeypatch.setenv("CONTACT_EMAIL", "you@example.com")

    monkeypatch.setattr(contact, "urlopen", lambda *args, **kwargs: calls.append(args))

    response = client.post(
        "/api/contact",
        json={"name": "Test", "email": "test@example.com", "message": "Hello"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Email service not configured."
    assert not calls


def test_contact_success_uses_mocked_resend(client, monkeypatch):
    calls = []
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("CONTACT_EMAIL", "owner@example.com")

    def fake_urlopen(req, timeout=10):
        calls.append((req, timeout))
        return FakeResendResponse()

    monkeypatch.setattr(contact, "urlopen", fake_urlopen)

    response = client.post(
        "/api/contact",
        json={"name": "Test", "email": "test@example.com", "message": "Hello"},
    )

    assert response.status_code == 200
    assert response.json() == {"success": True}
    assert len(calls) == 1
