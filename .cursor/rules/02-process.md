# Agent workflow (PLAN → APPLY → REVIEW)

1) PLAN: Summarize goals (00-goals), list touched files, cite any ADRs.
2) APPLY: Provide diffs. Write/extend tests first if changing behavior.
3) REVIEW: Update CHANGELOG_AGENT.md (what/why/files/ADR id).

## Forbidden

- Reverting prior work unless referencing failing tests or ADR that supersedes it.
- Large sweeping renames. Prefer small, test-backed diffs.
