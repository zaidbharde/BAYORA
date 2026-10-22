#!/usr/bin/env python3
"""Phase 6 acceptance, using Phase 7 encrypted release/reveal for payload delivery."""
import json
from pathlib import Path
import subprocess
import sys
import uuid
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from red_engine.runner import load_dataset, merkle_root, sha
DATASET = ROOT / "data/safe_smoke.jsonl"
RUN_ID = "phase6-safe-smoke-" + uuid.uuid4().hex[:12]

def run(cmd, timeout=60):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, timeout=timeout)

def main():
    rows = load_dataset(DATASET)
    root = merkle_root([sha(row["text"]) for row in rows])
    subprocess.run(["bash", "scripts/init_team_material.sh"], cwd=ROOT, check=True, timeout=30)
    for args in (("commit",), ("release-red",)):
        result=run([sys.executable,"tools/commit_reveal.py",args[0],"--run-id",RUN_ID])
        print(result.stdout,end="")
        if result.returncode: print(result.stderr,file=sys.stderr); return result.returncode
    token=subprocess.check_output([sys.executable,"tools/issue_token.py","--role","red","--run-id",RUN_ID],cwd=ROOT,text=True,timeout=5).strip()
    cmd=["sudo","docker","compose","exec","-T","-e",f"BAYORA_TOKEN={token}","red","python","/app/red_engine/runner.py","--dataset","/tmp/payloads.jsonl","--count","100"]
    try: red=run(cmd,600)
    except subprocess.TimeoutExpired:
        print("PHASE6_BLOCKED: 100 attempts exceeded 600s",file=sys.stderr); return 2
    print(red.stdout,end="")
    if red.returncode: print(red.stderr,file=sys.stderr); return red.returncode
    summary=json.loads(red.stdout.strip().splitlines()[-1])
    if summary.get("attempts")!=100 or summary.get("payload_merkle_root")!=root or summary["status_counts"].get("error"):
        print("PHASE6_FAIL: run summary mismatch",file=sys.stderr); return 1
    audit=[json.loads(x) for x in (ROOT/"data/audit/audit.jsonl").read_text().splitlines()]
    if not any(e["run_id"]==RUN_ID and e["event"]=="PAYLOAD_ROOT_COMMITTED" and e["data"].get("merkle_root")==root for e in audit):
        print("PHASE6_FAIL: payload root absent",file=sys.stderr); return 1
    for action in ("seal","reveal-blue"):
        result=run([sys.executable,"tools/commit_reveal.py",action,"--run-id",RUN_ID])
        print(result.stdout,end="")
        if result.returncode: print(result.stderr,file=sys.stderr); return result.returncode
        if action == "seal":
            reset=run(["bash","scripts/reset_model.sh"],timeout=140)
            print(reset.stdout,end="")
            if reset.returncode: print(reset.stderr,file=sys.stderr); return reset.returncode
    run([sys.executable,"tools/commit_reveal.py","cleanup","--run-id",RUN_ID])
    verified=run([sys.executable,"tools/bayora_verify.py"])
    print(verified.stdout,end="")
    if verified.returncode: print(verified.stderr,file=sys.stderr); return verified.returncode
    print("PHASE6_ACCEPTANCE_PASS: 100 attempts; committed root; sealed/revealed; Audit verifies")
    return 0
if __name__=="__main__": raise SystemExit(main())
