"""Bounds for the public API; no proxy headers are trusted here."""
from collections import OrderedDict, deque
from math import ceil
from threading import Lock
import time

from starlette.responses import JSONResponse

MAX_BODY_BYTES = 16 * 1024
MAX_QUERY_BYTES = 2048


class RateLimiter:
    """Atomic rolling windows with bounded storage; one instance per worker."""

    def __init__(self, per_client, total, window, max_clients=10_000):
        self.per_client, self.total, self.window = per_client, total, window
        self.max_clients = max_clients
        self._clients = OrderedDict()
        self._total = deque()
        self._lock = Lock()

    def clear(self):
        with self._lock:
            self._clients.clear()
            self._total.clear()

    def consume(self, client):
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            while self._total and self._total[0] <= cutoff:
                self._total.popleft()
            while self._clients and next(iter(self._clients.values()))[-1] <= cutoff:
                self._clients.popitem(last=False)
            recent = self._clients.get(client, deque())
            while recent and recent[0] <= cutoff:
                recent.popleft()
            if len(recent) >= self.per_client:
                return max(1, ceil(recent[0] + self.window - now))
            if len(self._total) >= self.total:
                return max(1, ceil(self._total[0] + self.window - now))
            if client not in self._clients and len(self._clients) >= self.max_clients:
                return self.window
            recent.append(now)
            self._clients[client] = recent
            self._clients.move_to_end(client)
            self._total.append(now)
        return 0


API_LIMITER = RateLimiter(60, 600, 60)
H2H_LIMITER = RateLimiter(20, 120, 60)
CONTACT_LIMITER = RateLimiter(3, 30, 3600)


class PublicAPIGuard:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not scope['path'].startswith('/api/'):
            return await self.app(scope, receive, send)

        async def reject(status, detail, headers=None):
            await JSONResponse({'detail': detail}, status_code=status, headers=headers)(scope, receive, send)

        if len(scope.get('query_string', b'')) > MAX_QUERY_BYTES:
            return await reject(414, 'Query string too long.')
        if scope['method'] != 'OPTIONS' and scope['path'] != '/api/health':
            client = scope.get('client')
            ip = client[0] if client else 'unknown'
            limits = [API_LIMITER]
            if scope['path'].startswith('/api/h2h/'):
                limits.append(H2H_LIMITER)
            if scope['path'].rstrip('/') == '/api/contact':
                limits.append(CONTACT_LIMITER)
            for limiter in limits:
                retry = limiter.consume(ip)
                if retry:
                    return await reject(429, 'Too many requests. Please try again later.',
                                        {'Retry-After': str(retry)})

        if scope['method'] in {'POST', 'PUT', 'PATCH'}:
            headers = dict(scope.get('headers', []))
            try:
                length = int(headers.get(b'content-length', b'0'))
            except ValueError:
                return await reject(400, 'Invalid Content-Length.')
            if length < 0:
                return await reject(400, 'Invalid Content-Length.')
            if length > MAX_BODY_BYTES:
                return await reject(413, 'Request body too large.')
            if scope['path'].rstrip('/') == '/api/contact':
                content_type = headers.get(b'content-type', b'').split(b';')[0].strip().lower()
                if content_type != b'application/json':
                    return await reject(415, 'Content-Type must be application/json.')
            # Count actual chunks as well: Content-Length may be absent or false.
            body = bytearray()
            while True:
                message = await receive()
                if message['type'] == 'http.disconnect':
                    return
                chunk = message.get('body', b'')
                if len(body) + len(chunk) > MAX_BODY_BYTES:
                    return await reject(413, 'Request body too large.')
                body.extend(chunk)
                if not message.get('more_body', False):
                    break
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
                return await receive()

            return await self.app(scope, bounded_receive, send)
        return await self.app(scope, receive, send)
