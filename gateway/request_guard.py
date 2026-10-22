"""Bound Gateway request bodies and emit hash-free, categorical violation events."""
from __future__ import annotations

import asyncio
import json
import time
from collections import OrderedDict, deque
from typing import Awaitable, Callable
from uuid import uuid4

from starlette.responses import JSONResponse

ViolationLogger = Callable[[dict[bytes, bytes], str, int, str, str], Awaitable[None]]


class GatewayRequestGuard:
    def __init__(self, app, *, max_body_bytes: int = 65536,
                 max_requests: int = 20, window_seconds: int = 60,
                 timing_bucket_ms: int = 5000,
                 violation_logger: ViolationLogger):
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.timing_bucket_ms = timing_bucket_ms
        self.violation_logger = violation_logger
        self.requests: OrderedDict[str, deque[float]] = OrderedDict()

    def _limited(self, source: str, now: float) -> bool:
        queue = self.requests.get(source)
        if queue is None:
            queue = deque()
            self.requests[source] = queue
        self.requests.move_to_end(source)
        while queue and now - queue[0] >= self.window_seconds:
            queue.popleft()
        if len(queue) >= self.max_requests:
            return True
        queue.append(now)
        if len(self.requests) > 2048:
            self.requests.popitem(last=False)
        return False

    async def _record(self, headers, path, status, code, request_id) -> bool:
        try:
            await self.violation_logger(headers, path, status, code, request_id)
            return True
        except Exception:
            return False

    async def _send(self, scope, receive, send, status: int, message: str,
                    started: float, path: str) -> None:
        response = JSONResponse(status_code=status, content={"detail": message})
        response.headers["Connection"] = "close"
        if path == "/attack":
            elapsed_ms = (time.monotonic() - started) * 1000
            target_ms = max(self.timing_bucket_ms,
                            int((elapsed_ms + 100 + self.timing_bucket_ms - 1) // self.timing_bucket_ms)
                            * self.timing_bucket_ms)
            await asyncio.sleep(max(0.0, (target_ms - elapsed_ms) / 1000))
        await response(scope, receive, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") == "/health":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "/")
        started = time.monotonic()
        request_id = uuid4().hex
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        client = scope.get("client") or ("unknown", 0)
        source = str(client[0])

        if self._limited(source, time.monotonic()):
            ok = await self._record(headers, path, 429, "rate_limit_exceeded", request_id)
            await self._send(scope, receive, send, 429 if ok else 503,
                             "request_rejected" if ok else "service_unavailable", started, path)
            return

        try:
            declared = int(headers.get(b"content-length", b"0") or b"0")
        except ValueError:
            ok = await self._record(headers, path, 400, "malformed_request", request_id)
            await self._send(scope, receive, send, 400 if ok else 503,
                             "request_rejected" if ok else "service_unavailable", started, path)
            return
        if declared < 0:
            ok = await self._record(headers, path, 400, "malformed_request", request_id)
            await self._send(scope, receive, send, 400 if ok else 503,
                             "request_rejected" if ok else "service_unavailable", started, path)
            return
        if declared > self.max_body_bytes:
            ok = await self._record(headers, path, 413, "oversized_request", request_id)
            await self._send(scope, receive, send, 413 if ok else 503,
                             "request_rejected" if ok else "service_unavailable", started, path)
            return

        chunks: list[bytes] = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > self.max_body_bytes:
                ok = await self._record(headers, path, 413, "oversized_request", request_id)
                await self._send(scope, receive, send, 413 if ok else 503,
                                 "request_rejected" if ok else "service_unavailable", started, path)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        body = b"".join(chunks)
        delivered = False

        async def replay_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}

        captured = []
        status = 500

        async def capture_send(message):
            nonlocal status
            captured.append(message)
            if message["type"] == "http.response.start":
                status = int(message["status"])

        await self.app(scope, replay_receive, capture_send)
        violation_codes = {
            400: "malformed_request", 401: "invalid_token", 403: "wrong_role",
            404: "unlisted_route", 413: "oversized_request", 422: "malformed_request",
            429: "rate_limit_exceeded",
        }
        if status in violation_codes:
            ok = await self._record(headers, path, status, violation_codes[status], request_id)
            if not ok:
                await self._send(scope, receive, send, 503, "service_unavailable", started, path)
                return
            # Suppress framework validation details that may echo supplied data.
            response = JSONResponse(status_code=status, content={"detail": "request_rejected"})
            if path == "/attack" and not scope.get("state", {}).get("timing_padded", False):
                elapsed_ms = (time.monotonic() - started) * 1000
                target_ms = max(self.timing_bucket_ms,
                                int((elapsed_ms + 100 + self.timing_bucket_ms - 1) // self.timing_bucket_ms)
                                * self.timing_bucket_ms)
                await asyncio.sleep(max(0.0, (target_ms - elapsed_ms) / 1000))
            await response(scope, receive, send)
            return

        for message in captured:
            await send(message)
