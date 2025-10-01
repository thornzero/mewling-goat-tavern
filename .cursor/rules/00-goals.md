# Project goals

- Stable movie poll for group nights; no duplicate entries; idempotent vote ops.
- Keep Go + Chi + SQLite + Templ + HTMX stack (no framework swaps).
- Admin dashboard remains fully functional during feature work.
- Deploy on Railway (don’t break Make targets in `makefile`).

## Success criteria

- "dev" runs via `make dev` with hot reload.
- Zero data loss across releases; existing DB file remains valid.
- Results page loads < 1s p95 in release mode.

## Canonical docs to read first (every session)

- README.md (arch + commands)
- docs/architecture.md (overview)
