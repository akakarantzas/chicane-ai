import asyncio
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from urllib.error import HTTPError, URLError

import pytest
from fastapi import HTTPException

from app import security
from app.routers import contact, h2h


@pytest.mark.parametrize('error_type', ['http', 'network'])
def test_provider_errors_never_log_or_return_private_content(client, monkeypatch, caplog, capsys, error_type):
    marker = 'synthetic-private-provider-content'
    monkeypatch.setenv('RESEND_API_KEY', 're_test_key')
    monkeypatch.setenv('CONTACT_EMAIL', 'owner@example.com')

    def fail(*args, **kwargs):
        if error_type == 'http':
            raise HTTPError('https://example.com/' + marker, 403, marker, {}, BytesIO(marker.encode()))
        raise URLError(marker)

    monkeypatch.setattr(contact, 'urlopen', fail)
    response = client.post('/api/contact', json={'email': 'test@example.com', 'message': 'Hello'})
    captured = capsys.readouterr()
    assert response.status_code == 502
    assert marker not in response.text + caplog.text + captured.out + captured.err


@pytest.mark.parametrize('fields', [
    {'name': 'x' * 101}, {'name': 'Name\r\nInjected header'},
    {'email': 'x' * 255}, {'message': 'x' * 2001},
    {'unexpected': 'synthetic-private-input'}, {'email': {'value': 'synthetic-private-input'}},
])
def test_contact_rejects_invalid_fields_without_echo_or_delivery(client, monkeypatch, fields):
    def unexpected(*args, **kwargs):
        pytest.fail('Invalid input reached email provider')
    monkeypatch.setattr(contact, 'urlopen', unexpected)
    response = client.post('/api/contact', json={'email': 'test@example.com', 'message': 'Hello', **fields})
    assert response.status_code == 422
    assert 'synthetic-private-input' not in response.text
    assert all('input' not in error for error in response.json()['detail'])


def test_contact_limits_attempts_and_does_not_trust_forwarded_header(client, monkeypatch):
    calls = []
    monkeypatch.setattr(contact, '_get_contact_config', lambda: ('re_test_key', 'owner@example.com'))
    from test_contact import FakeResendResponse
    monkeypatch.setattr(contact, 'urlopen', lambda *args, **kwargs: calls.append(1) or FakeResendResponse())
    for index in range(3):
        assert client.post('/api/contact', json={'email': 'test@example.com', 'message': 'Hi'},
                           headers={'X-Forwarded-For': f'192.0.2.{index}'}).status_code == 200
    response = client.post('/api/contact', json={'email': 'test@example.com', 'message': 'Hi'},
                           headers={'X-Forwarded-For': '192.0.2.99'})
    assert response.status_code == 429
    assert int(response.headers['retry-after']) > 0
    assert len(calls) == 3


def test_h2h_and_general_api_rate_limits(client):
    for _ in range(20):
        assert client.get('/api/h2h/monitoring').status_code == 200
    assert client.get('/api/h2h/monitoring').status_code == 429
    security.API_LIMITER.clear()
    for _ in range(60):
        assert client.get('/api/predictions/history').status_code == 200
    assert client.get('/api/predictions/history').status_code == 429
    assert client.get('/api/health').status_code == 200


def test_rate_limits_atomic_expiring_and_bounded(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(security.time, 'monotonic', lambda: now[0])
    limiter = security.RateLimiter(3, 4, 60, max_clients=2)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: limiter.consume('same-client'), range(20)))
    assert results.count(0) == 3
    assert limiter.consume('second-client') == 0
    assert limiter.consume('third-client') > 0
    assert len(limiter._clients) == 2
    now[0] += 61
    assert limiter.consume('third-client') == 0
    assert len(limiter._clients) == 1
    bounded = security.RateLimiter(3, 100, 60, max_clients=1)
    assert bounded.consume('first') == 0
    assert bounded.consume('second') > 0


def test_body_content_type_and_query_limits(client):
    assert client.post('/api/contact', content='x' * (security.MAX_BODY_BYTES + 1),
                       headers={'Content-Type': 'application/json'}).status_code == 413
    assert client.post('/api/contact', content='{}', headers={'Content-Type': 'text/plain'}).status_code == 415
    assert client.get('/api/health?' + 'x' * (security.MAX_QUERY_BYTES + 1)).status_code == 414


def test_chunked_body_cannot_bypass_limit():
    async def scenario():
        messages = iter([{'type': 'http.request', 'body': b'x' * 9000, 'more_body': True},
                         {'type': 'http.request', 'body': b'x' * 9000, 'more_body': False}])
        responses = []
        async def receive():
            return next(messages)
        async def send(message):
            responses.append(message)
        async def downstream(*args):
            pytest.fail('Oversized body reached application')
        scope = {'type': 'http', 'path': '/api/contact', 'method': 'POST',
                 'headers': [(b'content-type', b'application/json')], 'client': ('test', 1)}
        await security.PublicAPIGuard(downstream)(scope, receive, send)
        assert responses[0]['status'] == 413
    asyncio.run(scenario())


def test_provider_exception_not_returned_by_h2h(monkeypatch):
    marker = 'synthetic-private-provider-content'
    def fail(*args, **kwargs):
        raise RuntimeError(marker)
    for name in ('_load_fastf1_results', '_load_jolpica_results', '_load_openf1_results'):
        monkeypatch.setattr(h2h, name, fail)
    with pytest.raises(HTTPException) as caught:
        h2h._load_results(2026)
    assert caught.value.status_code == 502
    assert marker not in caught.value.detail


def test_h2h_input_bounds_and_nonreflective_errors(client):
    response = client.get('/api/h2h/predict', params={'driver1': 'x' * 200, 'driver2': 'NOR'})
    assert response.status_code == 422
    assert 'x' * 200 not in response.text
    response = client.get('/api/h2h/compare?driver1=BAD&driver2=NOR')
    assert response.status_code == 400
    assert 'BAD' not in response.text
    assert client.get('/api/h2h/predict?driver1=NOR&driver2=PIA&snapshot_id=invalid').status_code == 422


def test_cors_only_allows_configured_public_client(client):
    headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
               'Access-Control-Request-Headers': 'Content-Type'}
    response = client.options('/api/contact', headers=headers)
    assert response.status_code == 200
    assert 'access-control-allow-credentials' not in response.headers
    response = client.options('/api/contact', headers={**headers, 'Origin': 'https://untrusted.example'})
    assert response.status_code == 400
    assert 'access-control-allow-origin' not in response.headers
