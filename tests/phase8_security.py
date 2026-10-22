#!/usr/bin/env python3
"""Phase 8 security acceptance tests and generated evidence report."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import socket
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports/isolation_report.md"
results = []

def check(name, ok, evidence):
    results.append((name, "PASS" if ok else "FAIL", evidence))
    print(f"{name} {'PASS' if ok else 'FAIL'}: {evidence}", flush=True)
    if not ok: raise AssertionError(f"{name}: {evidence}")

def run(cmd, timeout=40, check=True):
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if check and result.returncode:
        raise RuntimeError((result.stderr or result.stdout)[-1200:])
    return result

def main():
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    try:
        run(["sudo", "docker", "compose", "config", "-q"])
        names = ["red", "blue", "gateway", "llm", "audit"]
        inspect = json.loads(run(["sudo", "docker", "inspect", *[f"bayora-{n}-1" for n in names]]).stdout)
        by_name = {item["Name"].lstrip("/").replace("bayora-", "").rsplit("-",1)[0]: item for item in inspect}
        secure = True
        for name in names:
            item = by_name[name]; cfg = item["HostConfig"]
            secure &= item["Config"]["User"] == "10001:10001"
            secure &= cfg["ReadonlyRootfs"] and cfg["CapDrop"] == ["ALL"] and cfg["PidsLimit"] == 64
            secure &= cfg["Memory"] > 0 and cfg["NanoCpus"] > 0
            secure &= any("no-new-privileges:true" in x for x in (cfg["SecurityOpt"] or []))
            secure &= cfg.get("NetworkMode") != "host" and cfg.get("PidMode") != "host" and cfg.get("IpcMode") != "host"
        check("BASELINE", secure, "non-root; read-only; cap-drop ALL; no-new-privileges; bounded PID/CPU/memory; non-host namespaces")

        # T01-T03 regression verifies Red only sees Gateway on its internal subnet.
        iso = run([sys.executable, "tests/isolation/phase1.py"], timeout=45)
        check("T01-T03", iso.returncode == 0, iso.stdout.strip().replace("\n", "; "))

        red_info = by_name["red"]
        mounts = red_info["Mounts"]
        no_tenant_bind = not any(m["Type"] == "bind" and (str(ROOT) in m.get("Source", "") or "docker.sock" in m.get("Source", "") + m.get("Destination", "")) for m in mounts)
        fs = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c",
                  "import os,pathlib; assert not pathlib.Path('/var/run/docker.sock').exists(); assert not pathlib.Path('/home/ubuntu').exists(); p=pathlib.Path('/tmp'); assert os.access(p,os.W_OK);\ntry: open('/etc/bayora-phase8-probe','w').write('x'); raise AssertionError('rootfs writable')\nexcept OSError: pass\nprint('readonly-root; tmpfs-writable; no-docker-socket; no-host-home')"])
        check("T05/T07-FS", no_tenant_bind and "readonly-root" in fs.stdout, "Red has no host bind mounts/docker.sock; rootfs rejects writes; only bounded /tmp tmpfs is writable")

        # T04: a real bounded attempt plus Compose's internal-network bit.
        external = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c",
            "import socket; s=socket.socket(); s.settimeout(2);\ntry: s.connect(('1.1.1.1',443)); print('CONNECTED'); raise SystemExit(2)\nexcept OSError as e: print(type(e).__name__)"])
        nets = json.loads(run(["sudo", "docker", "network", "inspect", "bayora_red_net"]).stdout)[0]
        check("T04", "CONNECTED" not in external.stdout and nets.get("Internal") is True,
              f"internal={nets.get('Internal')}; bounded egress probe: {external.stdout.strip()}")

        # T06: calls must fail with EPERM due seccomp/capability restrictions.
        syscall_code = """import ctypes, errno\nl=ctypes.CDLL(None,use_errno=True)\nchecks=[]\nfor name,call in [('unshare',lambda:l.unshare(0x00020000)),('mount',lambda:l.syscall(165,0,0,0,0,0)),('ptrace',lambda:l.syscall(101,16,1,0,0)),('init_module',lambda:l.syscall(175,0,0,0))]:\n ctypes.set_errno(0); r=call(); e=ctypes.get_errno(); checks.append((name,r,e))\nassert all(r==-1 and e==errno.EPERM for _,r,e in checks), checks\nprint(checks)"""
        sec = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", syscall_code])
        check("T06", True, "mount/unshare/ptrace/init_module blocked with EPERM: " + sec.stdout.strip())

        # T07: own PID namespace; compare namespace inode with the host's.
        container_ns = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c",
                    "import os; p=[x for x in os.listdir('/proc') if x.isdigit()]; assert len(p)<128; print(os.readlink('/proc/1/ns/pid')+' visible_pids='+str(len(p)))"])
        host_ns = os.readlink("/proc/self/ns/pid")
        pid_mode = red_info["HostConfig"].get("PidMode")
        check("T07", container_ns.stdout.split()[0] != host_ns and not pid_mode, f"host={host_ns}; container={container_ns.stdout.strip()}")

        # T17: bounded disk and PID pressure in Red; a disposable Red cgroup tests memory enforcement.
        stress_code = """import errno,os,signal,time\n# Fill the 16 MiB tmpfs only until ENOSPC.\nfd=os.open('/tmp/phase8-fill',os.O_CREAT|os.O_WRONLY,0o600); hit=False\ntry:\n while True: os.write(fd,b'x'*(1024*1024))\nexcept OSError as e: hit=e.errno==errno.ENOSPC\nfinally: os.close(fd); os.unlink('/tmp/phase8-fill')\nassert hit, 'tmpfs limit not reached'\nchildren=[]; capped=False\ntry:\n for _ in range(128):\n  try: pid=os.fork()\n  except OSError as e:\n   if e.errno in (errno.EAGAIN,errno.ENOMEM): capped=True; break\n   raise\n  if pid==0: time.sleep(10); os._exit(0)\n  children.append(pid)\nfinally:\n for pid in children:\n  try: os.kill(pid,signal.SIGKILL)\n  except ProcessLookupError: pass\n for pid in children:\n  try: os.waitpid(pid,0)\n  except ChildProcessError: pass\nassert capped, 'pids limit not reached'\nprint('tmpfs ENOSPC; pids cap reached at '+str(len(children)))"""
        stress = run(["sudo", "docker", "compose", "exec", "-T", "red", "python", "-c", stress_code], timeout=30)
        memory = run(["sudo", "docker", "compose", "run", "--rm", "--no-deps", "red", "python", "-c",
            "b=bytearray(1024*1024*1024); [b.__setitem__(i,1) for i in range(0,len(b),4096)]; print('UNEXPECTED_MEMORY_SUCCESS')"], timeout=45, check=False)
        red_health = run(["sudo", "docker", "inspect", "-f", "{{.State.Health.Status}}", "bayora-red-1"]).stdout.strip()
        mem_contained = memory.returncode != 0 and red_health == "healthy"
        check("T17", "tmpfs ENOSPC" in stress.stdout and "pids cap reached" in stress.stdout and mem_contained,
              f"{stress.stdout.strip()}; memory probe rc={memory.returncode}; Red health after probe={red_health}")

        # Rootless and userns evidence from the actual daemon.
        security = run(["sudo", "docker", "info", "--format", "{{json .SecurityOptions}}"]).stdout.strip()
        mapping = run(["sudo", "docker", "compose", "exec", "-T", "red", "cat", "/proc/self/uid_map"]).stdout.strip()
        check("USERNS", "userns" in security.lower() or "remap" in security.lower(), f"daemon security options={security}; uid_map={mapping}")
        now = datetime.now(timezone.utc).isoformat()
        body = ["# Isolation / Hardening Report", "", f"Generated: {now}", "", "| Test | Result | Evidence |", "|---|---|---|"]
        body += [f"| {name} | {status} | {evidence.replace('|','/')} |" for name,status,evidence in results]
        REPORT.write_text("\n".join(body)+"\n")
        print(f"REPORT_WRITTEN: {REPORT}")
        return 0
    except (AssertionError, RuntimeError, subprocess.SubprocessError, OSError) as exc:
        now = datetime.now(timezone.utc).isoformat()
        body = ["# Isolation / Hardening Report", "", f"Generated: {now}", "", "| Test | Result | Evidence |", "|---|---|---|"]
        body += [f"| {name} | {status} | {evidence.replace('|','/')} |" for name,status,evidence in results]
        body.append(f"| PHASE8 | BLOCKED/FAIL | {str(exc).replace('|','/')} |")
        REPORT.write_text("\n".join(body)+"\n")
        print(f"PHASE8_FAIL: {exc}\nREPORT_WRITTEN: {REPORT}", file=sys.stderr)
        return 1

if __name__ == "__main__": raise SystemExit(main())
