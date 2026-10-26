# Upstream provenance and licensing notes

## Phoenix source boundary

The verified upstream is [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix), default branch `main`, commit `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`. The user's supplied `phoenix-main.zip` was compared file-by-file with the tracked checkout: 8,447 files, zero missing tracked files and zero byte mismatches. This establishes an exact file snapshot of that commit, not the ZIP's Git history. The separate checkout lives at `/home/ubuntu/bayora-research/phoenix`; no Phoenix application source is copied or modified by this BAYORA prototype. A reproducible comparison utility is in `scripts/verify-phoenix-snapshot.py`.

The upstream tree identifies its license as **Elastic License 2.0 (ELv2)** and carries an Arize AI `IP_NOTICE`. Copies of the exact license and notice are retained in `third-party-notices/phoenix/`. Upstream application code, database, license controls and trademark material are not included in the BAYORA application bundle.

## Material ELv2 conditions noted for this project

The verified `LICENSE` says the grant to use, copy, distribute, make available and prepare derivative works is subject to its limitations. In particular, a recipient may not provide the software to third parties as a hosted or managed service where that service gives access to a substantial set of Phoenix features/functionality; may not move, change, disable or circumvent license-key functionality or remove/obscure license-protected features; and may not alter, remove or obscure licensor licensing, copyright or other notices. Anyone who receives any part of the software must also receive these terms, and modified copies need prominent modification notices. The license also includes patent, termination and warranty terms. The source `IP_NOTICE` identifies Arize AI, Inc. and named US patents.

BAYORA is a separate integration client, not a hosted Phoenix service. At the owner's request its original source is being published to `zaidbharde/BAYORA`; no Phoenix application code, database, or runtime is included or deployed. Public source distribution of original BAYORA code is distinct from hosting Phoenix or offering substantial Phoenix functionality as a managed service. Any later redistribution of Phoenix-derived code or Phoenix hosting change requires a fresh review of the complete upstream license and deployment model. This document is a record of inspected conditions, not legal advice.

## Direct runtime components bundled by BAYORA


| Component | Pinned version | Declared license | Use |
| --- | ---: | --- | --- |
| React | 19.3.1 | MIT | User interface |
| React DOM | 19.3.1 | MIT | Browser rendering |
| React Router DOM | 7.18.4 | MIT | Page routing |
| Express | 5.3.0 | MIT | BAYORA API and development server |
| Lucide React | 1.61.0 | ISC | Interface icons |
| Geist variable font package | 5.3.0 | SIL Open Font License 1.1 | Interface typography |
| IBM Plex Mono font package | 5.3.0 | SIL Open Font License 1.1 | Identifiers and data |

Exact package versions are pinned in `package.json` and transitive resolution is pinned in `pnpm-lock.yaml`. Full notice texts copied from the installed, pinned package distributions are retained under `third-party-notices/runtime/`; the exact upstream Phoenix `LICENSE` and `IP_NOTICE` are under `third-party-notices/phoenix/`. The font files are distributed from the published font packages without modification. The project does not assign an independent license to original BAYORA code in this prototype because the owner did not specify one; the upstream Phoenix notice applies only to its separately licensed code and notices, not to the BAYORA implementation.


For the exact notices and license texts of every direct runtime and development/build/test dependency pinned by this project, see the [third-party notices and dependency licenses index](THIRD_PARTY_NOTICES.md). The complete package-distributed direct development dependency license texts are retained under `third-party-notices/development/`.
