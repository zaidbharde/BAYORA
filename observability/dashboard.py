"""Operator dashboard with aggregate metrics only; no event, run, or payload detail."""
from __future__ import annotations

import html
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode
from urllib.request import urlopen

PROMETHEUS = os.getenv("BAYORA_PROMETHEUS_URL", "http://prometheus:9090")


def query_scalar(expression: str) -> str:
    url = PROMETHEUS + "/api/v1/query?" + urlencode({"query": expression})
    with urlopen(url, timeout=3) as response:
        data = json.load(response)
    if data.get("status") != "success":
        raise RuntimeError("metrics unavailable")
    results = data.get("data", {}).get("result", [])
    return str(int(float(results[0]["value"][1]))) if results else "0"


def firing_alerts() -> list[tuple[str, str]]:
    with urlopen(PROMETHEUS + "/api/v1/alerts", timeout=3) as response:
        data = json.load(response)
    alerts = []
    for alert in data.get("data", {}).get("alerts", []):
        if alert.get("state") == "firing":
            labels = alert.get("labels", {})
            alerts.append((str(labels.get("alertname", "Alert")),
                           str(labels.get("severity", "info"))))
    return sorted(set(alerts))


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, "text/plain; charset=utf-8", b"ok\n")
        if self.path != "/":
            return self._send(404, "text/plain; charset=utf-8", b"not found\n")
        try:
            violations = query_scalar("sum(bayora_policy_violations_total)")
            compromised = query_scalar("bayora_integrity_compromised_runs_total")
            entries = query_scalar("bayora_audit_entries_total")
            alerts = firing_alerts()
        except Exception:
            return self._send(503, "text/plain; charset=utf-8", b"Monitoring data unavailable\n")
        alert_html = "<li>None</li>" if not alerts else "".join(
            f"<li>{html.escape(name)} ({html.escape(severity)})</li>" for name, severity in alerts)
        page = ("<!doctype html><html lang='en'><meta charset='utf-8'>"
                "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                "<title>BAYORA system overview</title><main>"
                "<h1>BAYORA system overview</h1>"
                f"<p>Policy violations recorded: <strong>{html.escape(violations)}</strong></p>"
                f"<p>Runs flagged for integrity review: <strong>{html.escape(compromised)}</strong></p>"
                f"<p>Signed audit entries: <strong>{html.escape(entries)}</strong></p>"
                f"<h2>Operator alerts</h2><ul>{alert_html}</ul>"
                "<p>Metrics are aggregate counts. Request content and run identifiers are not displayed.</p>"
                "</main></html>")
        return self._send(200, "text/html; charset=utf-8", page.encode("utf-8"))

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8085), Handler).serve_forever()
