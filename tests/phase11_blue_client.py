#!/usr/bin/env python3
"""Blue-network probe for operator monitoring isolation."""
import socket

blocked = True
for host, port in (("prometheus", 9090), ("dashboard", 8085), ("audit", 8081)):
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        continue
    for family, socktype, proto, _, address in addresses:
        try:
            with socket.socket(family, socktype, proto) as sock:
                sock.settimeout(0.5)
                sock.connect(address)
            blocked = False
        except OSError:
            pass
if not blocked:
    raise SystemExit("Blue reached operator monitoring")
print('{"monitoring_blocked":true}')
