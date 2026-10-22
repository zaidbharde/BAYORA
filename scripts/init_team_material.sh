#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/secrets"
mkdir -p "$DIR"
chmod 700 "$DIR"
if [[ -f "$DIR/red.agekey" && -f "$DIR/blue.agekey" && -f "$DIR/red_payloads.age" && -f "$DIR/blue_rules.age" ]]; then
  echo "Team bundles already initialized; refusing to rotate implicitly"
  exit 0
fi
for file in red.agekey blue.agekey red_payloads.age blue_rules.age; do
  if [[ -e "$DIR/$file" ]]; then echo "Partial team bundle exists ($file); inspect before recovery" >&2; exit 1; fi
done
age-keygen -o "$DIR/red.agekey" 2>/dev/null
age-keygen -o "$DIR/blue.agekey" 2>/dev/null
chmod 600 "$DIR/red.agekey" "$DIR/blue.agekey"
red_pub="$(age-keygen -y "$DIR/red.agekey")"
blue_pub="$(age-keygen -y "$DIR/blue.agekey")"
age -r "$red_pub" -o "$DIR/red_payloads.age" "$ROOT/data/safe_smoke.jsonl"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
printf '%s\n' '{"rules_version":"phase7-demo","input_mode":"deny-policy-evasion-meta","output_canary":"BAYORA_CANARY_DEMO_1234"}' > "$tmp"
age -r "$blue_pub" -o "$DIR/blue_rules.age" "$tmp"
chmod 600 "$DIR/red_payloads.age" "$DIR/blue_rules.age"
echo "Initialized separate Red/Blue age identities and encrypted bundles. Private identities remain host-only."
