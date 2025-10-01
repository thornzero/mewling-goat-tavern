# Hard constraints

- Do not change DB schema without a migration + ADR.
- Keep `movie-poll/` layout and service boundaries (router/service/view separation).
- Templ is the only server-rendered view layer; no raw HTML duplication.
- TMDB integration stays behind the service; no direct calls from handlers/views.

## Public contracts (must not break)

- CLI behavior in `cmd/db-manager` (targets in README).
- Admin routes and query params.
