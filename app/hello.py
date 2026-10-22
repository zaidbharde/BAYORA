"""Minimal HTTP hello service used only by BAYORA Phase 1."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os

ROLE = os.environ.get("BAYORA_ROLE", "service")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"service": ROLE, "status": "hello"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
