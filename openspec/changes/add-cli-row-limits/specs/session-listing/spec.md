## ADDED Requirements

### Requirement: Default bounded output for session listing

The `list` command SHALL display at most the 20 most recent sessions by default, sorted descending by last activity timestamp. When more sessions exist than are displayed, the command SHALL print a footer that states the number of rows shown, the number of rows omitted, and the flag needed to show all rows.

#### Scenario: Project has fewer than the default limit

- **WHEN** a user runs `claude-code-tool list` in a project directory with 5 sessions
- **THEN** all 5 sessions are printed, sorted with the most recent first
- **AND** the footer reads `5 session(s) total.` with no mention of omitted rows

#### Scenario: Project exceeds the default limit

- **WHEN** a user runs `claude-code-tool list` in a project directory with 50 sessions
- **THEN** exactly 20 sessions are printed, corresponding to the 20 most recent by `lastTimestamp`
- **AND** the footer indicates that 30 additional sessions were omitted and that `--all` will show them

#### Scenario: No subcommand invocation applies the same default

- **WHEN** a user runs `claude-code-tool` with no subcommand in a project directory with 50 sessions
- **THEN** the output is identical to `claude-code-tool list` — 20 rows plus the omitted-row footer

### Requirement: Custom row limit for session listing

The `list` command SHALL accept a `--limit <n>` flag (short form `-n`) that overrides the default row cap. The flag SHALL require a positive integer; zero and negative values SHALL cause the command to exit with a non-zero status and a descriptive error.

#### Scenario: User requests a larger window

- **WHEN** a user runs `claude-code-tool list --limit 100` in a project with 50 sessions
- **THEN** all 50 sessions are printed
- **AND** the footer reads `50 session(s) total.` with no omitted-row notice

#### Scenario: User requests a smaller window

- **WHEN** a user runs `claude-code-tool list -n 5` in a project with 50 sessions
- **THEN** exactly 5 sessions are printed, corresponding to the 5 most recent
- **AND** the footer indicates 45 rows were omitted

#### Scenario: Invalid limit value

- **WHEN** a user runs `claude-code-tool list --limit 0`
- **THEN** the command exits with a non-zero status
- **AND** stderr contains a message explaining that `--limit` must be a positive integer

### Requirement: Unbounded listing opt-out

The `list` command SHALL accept an `--all` flag (short form `-a`) that disables any row cap. When `--all` is supplied alongside `--limit`, `--all` SHALL take precedence.

#### Scenario: All flag prints every session

- **WHEN** a user runs `claude-code-tool list --all` in a project with 50 sessions
- **THEN** all 50 sessions are printed, sorted most-recent-first
- **AND** the footer reads `50 session(s) total.` with no omitted-row notice

#### Scenario: All flag overrides limit flag

- **WHEN** a user runs `claude-code-tool list --limit 5 --all`
- **THEN** all sessions are printed, as if `--limit` had not been passed
