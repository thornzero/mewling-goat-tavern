# Services (movie-poll/services)

- Router only wires handlers; no business logic.
- Handlers are thin; call services; return template results or JSON.
- SQLite service owns queries; keep PRAGMA and schema assumptions in one place.
