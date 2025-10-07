# ADR-001: Shared Infrastructure Extraction

## Status

Proposed

## Context

We are merging the barkeep TUI application with the mewling-goat-tavern movie-poll web application to create a unified tavern management platform. Both applications share common infrastructure needs:

- Database management (GORM with SQLite)
- Session management (user authentication and state)
- HTTP routing and middleware (Chi router)
- Configuration management (environment variables)
- View rendering (Templ templates)

Currently, these components are duplicated or would need to be duplicated for the barkeep web interface.

## Decision

Extract common infrastructure components into a shared package structure:

```
shared/
├── database/          # GORM service, database config
├── session/           # Session management
├── router/            # HTTP routing and middleware
├── handlers/          # Base HTTP handlers
├── views/             # Shared templates
├── config/            # Configuration management
├── services/          # Shared services
└── interfaces/        # Service interfaces
```

This shared infrastructure will be used by both:

- `apps/movie-poll/` - Movie polling web application
- `apps/barkeep/` - Tavern management web application

## Consequences

### Positive

- **Code Reuse**: Eliminates duplication of common functionality
- **Consistency**: Both applications use the same underlying services
- **Maintainability**: Single source of truth for infrastructure components
- **Testing**: Shared components can be tested once and used everywhere
- **Performance**: Shared database connections and session management

### Negative

- **Coupling**: Applications become dependent on shared components
- **Complexity**: Initial setup is more complex
- **Breaking Changes**: Changes to shared components affect all applications

### Risks

- **Over-abstraction**: Risk of creating overly complex shared interfaces
- **Version Conflicts**: Different applications might need different versions of shared components
- **Testing Complexity**: Integration testing becomes more complex

## Mitigation Strategies

- Use dependency injection to minimize coupling
- Maintain backward compatibility in shared interfaces
- Comprehensive test coverage for shared components
- Clear versioning strategy for shared components
- Documentation for shared component APIs

## Implementation Plan

1. Extract existing movie-poll services to shared structure
2. Update movie-poll to use shared components
3. Create barkeep web interface using shared components
4. Implement unified routing system
5. Add comprehensive testing

## Related ADRs

- ADR-002: Admin/Patron User System Design
- ADR-003: Unified Routing Architecture
