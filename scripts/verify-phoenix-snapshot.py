#!/usr/bin/env python3
"""Compare a Phoenix source ZIP with every tracked file in a separate Git checkout."""
from __future__ import annotations

import argparse
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath


def git(source: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(source), *args])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Source ZIP downloaded from the repository")
    parser.add_argument("source_checkout", type=Path, help="Separate clean Phoenix Git checkout")
    args = parser.parse_args()
    archive_path = args.archive.resolve()
    source = args.source_checkout.resolve()
    if not archive_path.is_file() or not (source / ".git").exists():
        parser.error("archive must exist and source_checkout must be a Git checkout")

    commit = git(source, "rev-parse", "HEAD").decode().strip()
    tracked = set(git(source, "ls-files", "-z").decode().split("\0")) - {""}
    missing: list[str] = []
    extra: list[str] = []
    mismatched: list[str] = []

    with zipfile.ZipFile(archive_path) as archive:
        names = [name for name in archive.namelist() if not name.endswith("/")]
        roots = {name.split("/", 1)[0] for name in names if "/" in name}
        common_root = next(iter(roots)) if len(roots) == 1 and all("/" in name for name in names) else ""
        entries: dict[str, zipfile.ZipInfo] = {}
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename
            if common_root:
                if not name.startswith(common_root + "/"):
                    extra.append(name)
                    continue
                name = name[len(common_root) + 1 :]
            path = PurePosixPath(name)
            if path.is_absolute() or ".." in path.parts:
                extra.append(info.filename)
                continue
            if name in entries:
                extra.append(info.filename)
                continue
            entries[name] = info

        zip_files = set(entries)
        missing = sorted(tracked - zip_files)
        extra.extend(sorted(zip_files - tracked))
        for name in sorted(tracked & zip_files):
            checkout_bytes = git(source, "show", f"{commit}:{name}")
            archive_bytes = archive.read(entries[name])
            if checkout_bytes != archive_bytes:
                mismatched.append(name)

    print(f"Phoenix checkout commit: {commit}")
    print(f"Tracked files: {len(tracked)}; ZIP files: {len(entries)}")
    print(f"Missing: {len(missing)}; extra: {len(extra)}; byte mismatches: {len(mismatched)}")
    for label, values in (("missing", missing), ("extra", sorted(set(extra))), ("mismatched", mismatched)):
        for value in values[:20]:
            print(f"{label}: {value}")
        if len(values) > 20:
            print(f"{label}: … and {len(values) - 20} more")
    if missing or extra or mismatched:
        print("FAIL: snapshot does not exactly match the tracked checkout contents.", file=sys.stderr)
        return 1
    print("PASS: every tracked file matches byte-for-byte; no ZIP extras.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
