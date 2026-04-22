## ADDED Requirements

### Requirement: Project-scoped full-text search

The server SHALL expose a `GET /search?q=<query>&scope=project&project=<id>` endpoint that returns HTML fragments naming sessions within the given project whose messages contain the query as a case-insensitive substring. Results SHALL include, for each matching session, a link to the session detail page, the session's date and slug, and up to three context snippets of at most 80 characters each surrounding the match. Results SHALL be ordered with the most recent `lastTimestamp` first.

#### Scenario: Query matches multiple sessions in a project

- **WHEN** a user issues `/search?q=hello&scope=project&project=<id>` and two sessions in the project contain the substring `hello`
- **THEN** the response is a `200` HTML fragment containing exactly those two sessions as result entries
- **AND** the more recently updated session is listed first

#### Scenario: Query matches no sessions

- **WHEN** a user issues a search with a query that does not appear in any message in scope
- **THEN** the response is a `200` HTML fragment with a "No results" state

#### Scenario: Empty query

- **WHEN** a user issues `/search?q=` (empty query)
- **THEN** the response is a `200` HTML fragment instructing the user to enter a query
- **AND** no `.jsonl` files are read

### Requirement: Cross-project full-text search

The search endpoint SHALL accept `scope=all`, in which case the query SHALL be evaluated across every discovered project. Results SHALL include the project display name alongside the session information, and SHALL be ordered with the most recent `lastTimestamp` first across all projects.

#### Scenario: Query matches sessions in multiple projects

- **WHEN** a user issues `/search?q=hello&scope=all` and sessions in two different projects match
- **THEN** the response contains result entries from both projects
- **AND** each entry shows its owning project's display name
- **AND** results are interleaved by `lastTimestamp` rather than grouped by project

### Requirement: Default search scope is the current project

When the UI presents the search form on a project page, the default scope SHALL be the current project. A visible control SHALL let the user widen the scope to "All projects" before issuing the query.

#### Scenario: Search form on a project page

- **WHEN** a user opens the session list page for a project
- **THEN** the search form is pre-configured with `scope=project` and the project's id
- **AND** a control labeled "Search all projects" (or equivalent) is visible

### Requirement: Result count cap

A single search response SHALL contain at most 50 result entries. When more than 50 sessions match, the response SHALL include a note indicating that additional results were truncated.

#### Scenario: Very broad query

- **WHEN** a user issues a search whose query matches more than 50 sessions
- **THEN** the response contains exactly 50 result entries
- **AND** the response body includes text indicating that further results were truncated
