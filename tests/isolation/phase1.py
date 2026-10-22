"""Bounded live T01-T03 smoke checks; requires Docker Engine and Compose v2."""
import json
import shutil
import subprocess
import sys


def docker(*args):
    return subprocess.check_output(["sudo", "docker", *args], text=True, timeout=10).strip()


def inspect_ip(service, network):
    container_id = docker("compose", "ps", "-q", service)
    info = json.loads(docker("inspect", container_id))[0]
    return info["NetworkSettings"]["Networks"][network]["IPAddress"]


def main():
    if not shutil.which("docker"):
        print("BLOCKED: Docker is required for live T01-T03 checks.")
        return 2
    try:
        gateway_ip = inspect_ip("gateway", "bayora_red_net")
        red_ip = inspect_ip("red", "bayora_red_net")
        blue_ip = inspect_ip("blue", "bayora_blue_net")
        llm_ip = inspect_ip("llm", "bayora_model_net")
        net = json.loads(docker("network", "inspect", "bayora_red_net"))[0]
        members = net.get("Containers") or {}
        member_names = sorted(item["Name"] for item in members.values())
        # T03 probes every live endpoint attached to red_net, not unused IPs.
        # This is bounded and covers all actual peers in the Red zone.
        attached_ips = sorted(item["IPv4Address"].split("/")[0] for item in members.values())
        expected_names = sorted(("bayora-red-1", "bayora-gateway-1"))
        if member_names != expected_names:
            print(f"T03 FAIL: red_net members {member_names!r}; expected {expected_names!r}")
            return 1
        remote = ["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", REMOTE,
                  gateway_ip, blue_ip, llm_ip, red_ip, json.dumps(attached_ips)]
        return subprocess.run(remote, text=True, timeout=20).returncode
    except subprocess.TimeoutExpired:
        print("BLOCKED: Docker inspection or tenant checks exceeded the 20-second bound.")
        return 2
    except subprocess.CalledProcessError as exc:
        print(f"BLOCKED: Docker command failed: {exc}")
        return 2


REMOTE = r'''import json, socket, sys

gateway, blue, llm, red, attached = sys.argv[1:]
attached = json.loads(attached)
def can_connect(host, port=8000, timeout=.25):
    try:
        with socket.create_connection((host, port), timeout=timeout): return True
    except OSError: return False

# T01: known isolated service IPs must not be reachable from Red.
assert not can_connect(blue, 8082), "T01 FAIL: Red connected directly to Blue IP"
assert not can_connect(llm, 11434), "T01 FAIL: Red connected directly to LLM IP"
print("T01 PASS: direct Blue/LLM IP access denied")

# T02: peer service names must not resolve from Red.
for name in ("blue", "llm", "orchestrator"):
    try: socket.getaddrinfo(name, 8000)
    except socket.gaierror: continue
    raise AssertionError("T02 FAIL: %s resolved from Red" % name)
print("T02 PASS: Blue/LLM/orchestrator names do not resolve")

# T03: probe each live container address on Red's network, excluding Red itself.
reachable = [ip for ip in attached if ip != red and can_connect(ip, 8080)]
assert reachable == [gateway], "T03 FAIL: reachable peers %r; expected only Gateway %s" % (reachable, gateway)
print("T03 PASS: only Gateway reachable among attached Red-network endpoints")
'''

if __name__ == "__main__":
    raise SystemExit(main())
