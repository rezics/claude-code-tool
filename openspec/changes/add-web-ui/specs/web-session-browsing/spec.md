## ADDED Requirements

### Requirement: Per-project session list page

A `GET /p/<project-id>` request SHALL render an HTML page listing the project's sessions. Each row SHALL show the session ID prefix, slug, git branch, message count, a human-friendly date, and a truncated first user message, and SHALL link to the session detail page for that session. Rows SHALL be sorted with the most recent `lastTimestamp` first.

#### Scenario: Existing project with sessions

- **WHEN** a user requests `/p/<existing-project-id>`
- **THEN** the response is a `200` HTML page
- **AND** the page contains one row per session in the project
- **AND** each row links to `/p/<project-id>/s/<session-id>`

#### Scenario: Project with no sessions

- **WHEN** a user requests `/p/<project-id>` for a project whose directory exists but contains no `.jsonl` files
- **THEN** the response is a `200` HTML page showing an explanatory empty state rather than an error

#### Scenario: Nonexistent project id

- **WHEN** a user requests `/p/does-not-exist`
- **THEN** the response has status `404`
- **AND** the body contains a link back to the all-projects index

### Requirement: Session list pagination

The session list SHALL render at most 50 sessions per page. Additional sessions SHALL be available via an HTMX-driven "Load more" control or an equivalent keyset-like query parameter. The ordering guarantee (most recent first) SHALL be preserved across pages.

#### Scenario: Project with many sessions

- **WHEN** a user requests `/p/<id>` for a project with 127 sessions
- **THEN** the first response contains exactly 50 rows, corresponding to the 50 most recent sessions
- **AND** a "Load more" control is present

#### Scenario: Subsequent page

- **WHEN** the user activates "Load more" after the initial page
- **THEN** the next 50 rows (51st through 100th most recent) are inserted below the existing rows
- **AND** the new rows preserve most-recent-first ordering with respect to the existing rows

### Requirement: Session detail page renders full conversation

A `GET /p/<project-id>/s/<session-id>` request SHALL render a page containing the same header metadata as the CLI `show` command, followed by every non-meta message in the session in chronological order. Message content SHALL be rendered as HTML via a markdown renderer; fenced code blocks SHALL be rendered inside `<pre><code>`. User-authored content SHALL be escaped before markdown rendering such that embedded HTML in message text cannot break out into the surrounding page.

#### Scenario: Session with many messages

- **WHEN** a user requests the detail page for a session with 500 messages
- **THEN** the response contains 500 message blocks in the order they appeared in the `.jsonl`
- **AND** each block is labeled with the message role (user / assistant) and timestamp

#### Scenario: Message contains fenced code

- **WHEN** a message's content contains a fenced code block
- **THEN** the rendered HTML contains a `<pre><code>` element wrapping the code, preserving whitespace

#### Scenario: Malicious HTML in message content

- **WHEN** a message's content contains a literal `<script>` tag
- **THEN** the rendered page escapes or removes the tag such that no script executes when the page is loaded

### Requirement: Resume affordance reveals CLI command

The session detail page SHALL include a "Resume in terminal" affordance that reveals the exact `claude --resume <session-id>` command and offers a one-click copy button. The page MUST NOT attempt to spawn a terminal process from the browser.

#### Scenario: User clicks "Show resume command"

- **WHEN** the user activates the resume affordance on a detail page
- **THEN** the page reveals the string `claude --resume <session-id>` in a copyable element
- **AND** activating the copy control writes that string to the clipboard
- **AND** no process is spawned on the server

### Requirement: Delete with confirmation

The session detail page and each row in the session list SHALL offer a "Delete" control. Activating the control SHALL prompt for confirmation before issuing an HTTP `POST /p/<project-id>/s/<session-id>/delete` (or equivalent). A successful deletion SHALL remove the session's `.jsonl`, its sibling `.jsonl.wakatime` (if present), and its companion directory (if present) using the same logic as the CLI `delete` command.

#### Scenario: Confirmed deletion

- **WHEN** the user confirms deletion of a session
- **THEN** the server removes the session files via the shared deletion helper
- **AND** the server responds with `204` or an equivalent success status
- **AND** the session row is removed from the list view

#### Scenario: Cancelled deletion

- **WHEN** the user cancels the confirmation dialog
- **THEN** no request is issued to the server
- **AND** no files are modified

#### Scenario: Deletion of a session that was concurrently removed

- **WHEN** the server receives a deletion request for a session whose `.jsonl` no longer exists
- **THEN** the response status is a `2xx` or `404` with a body that reports the session is already absent
- **AND** no error page is rendered
