## ADDED Requirements

### Requirement: Enumerate projects from the Claude projects root

The server SHALL discover available projects by enumerating immediate subdirectories of `~/.claude/projects/`. Each subdirectory whose name matches the encoded-cwd pattern SHALL be treated as a project. Directories containing no `.jsonl` files SHALL be omitted from the project list.

#### Scenario: Populated projects root

- **WHEN** the server starts with `~/.claude/projects/` containing three subdirectories, two of which contain at least one `.jsonl` file
- **THEN** the project list exposed to the UI contains exactly those two projects
- **AND** the third directory is not listed

#### Scenario: Missing projects root

- **WHEN** the server starts on a machine where `~/.claude/projects/` does not exist
- **THEN** the project list is empty
- **AND** the UI renders an explanatory empty state rather than an error

### Requirement: Recover original `cwd` from session content

For each discovered project, the server SHALL attempt to recover the original working-directory path by reading the first valid JSON entry from any `.jsonl` file in that project's directory and extracting its `cwd` field. The recovered `cwd` SHALL be used as the project's display name. The encoded directory name SHALL be retained as the stable identifier for routing.

#### Scenario: Session file has a `cwd` field

- **WHEN** a project directory contains at least one `.jsonl` whose first valid JSON entry has a `cwd` field of `"D:/Projects-ICS/claude-code-tool"`
- **THEN** the project's display name is `D:/Projects-ICS/claude-code-tool`
- **AND** the project's routing identifier remains the encoded directory name (e.g., `D--Projects-ICS-claude-code-tool`)

#### Scenario: No recoverable `cwd`

- **WHEN** a project directory's `.jsonl` files contain no entry with a `cwd` field
- **THEN** the project's display name falls back to the encoded directory name
- **AND** the UI annotates the entry as "cwd unknown"

### Requirement: Map current working directory to the default project

On server start, the tool SHALL compute the encoded-directory name for `process.cwd()` using the same encoding as the rest of the tool. When a project with that encoded name exists, a request to the root path `/` SHALL redirect to that project's view. When no such project exists, a request to `/` SHALL render the all-projects index.

#### Scenario: CWD corresponds to an existing project

- **WHEN** a user runs `claude-code-tool web` inside `D:/Projects-ICS/claude-code-tool` and that project has sessions
- **THEN** an HTTP `GET /` returns a redirect (3xx) to `/p/D--Projects-ICS-claude-code-tool`

#### Scenario: CWD has no corresponding project

- **WHEN** a user runs `claude-code-tool web` inside a directory with no Claude Code sessions recorded
- **THEN** an HTTP `GET /` returns a `200` response rendering the all-projects index
- **AND** the response body does not present an error

### Requirement: Project-list ordering

The project list SHALL be ordered by the maximum `lastTimestamp` observed across each project's sessions, most recent first. Projects for which no timestamp can be recovered SHALL be sorted to the end in encoded-name order.

#### Scenario: Two projects with different recent activity

- **WHEN** project A's most recent session ended at `2026-04-01T10:00:00Z` and project B's most recent session ended at `2026-04-22T10:00:00Z`
- **THEN** project B is listed before project A in the all-projects index

### Requirement: Discovery cache and refresh

The server SHALL cache the result of project discovery in memory for its lifetime to avoid re-enumerating per request. The UI SHALL expose a "Refresh projects" action that invalidates this cache and re-runs discovery on the next relevant request.

#### Scenario: Cache avoids redundant enumeration

- **WHEN** the UI issues two consecutive requests for the all-projects index within the same server run
- **THEN** the second request does not re-enumerate `~/.claude/projects/`

#### Scenario: Refresh action busts cache

- **WHEN** the user triggers "Refresh projects" and the next relevant request arrives
- **THEN** project discovery runs again and any newly added project directory appears in the list
