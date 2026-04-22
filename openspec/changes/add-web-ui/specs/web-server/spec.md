## ADDED Requirements

### Requirement: `web` subcommand starts an HTTP server

The tool SHALL expose a `web` subcommand that starts an HTTP server serving the web UI. The command SHALL print the final bound URL (scheme + host + port) to stdout before the server begins accepting requests.

#### Scenario: Default invocation prints URL and serves

- **WHEN** a user runs `claude-code-tool web`
- **THEN** an HTTP server is started
- **AND** stdout contains a line of the form `Serving at http://127.0.0.1:<port>` before any request is accepted
- **AND** a subsequent HTTP `GET /` to that URL returns a `2xx` or `3xx` response

### Requirement: Loopback binding by default

When `--host` is not supplied, the server SHALL bind to `127.0.0.1`. When `--host` is supplied with a non-loopback address, the server SHALL still start but MUST emit a warning to stdout before accepting requests.

#### Scenario: Default binding is loopback

- **WHEN** a user runs `claude-code-tool web`
- **THEN** the server is bound to `127.0.0.1`
- **AND** a connection attempt to the server's port from a non-loopback interface is refused by the OS

#### Scenario: Explicit non-loopback binding triggers warning

- **WHEN** a user runs `claude-code-tool web --host 0.0.0.0`
- **THEN** the server binds to `0.0.0.0`
- **AND** stdout contains a warning that session contents may be exposed on the network, emitted before the server begins accepting requests

### Requirement: Port selection and conflict fallback

The server SHALL use port `4719` by default. When the default port is already bound, the server SHALL request an ephemeral port from the OS and use that instead. When the user supplies `--port <n>` and that port is bound, the server SHALL fail fast with a non-zero exit status rather than falling back.

#### Scenario: Default port free

- **WHEN** a user runs `claude-code-tool web` on a machine where port `4719` is unbound
- **THEN** the server binds to `4719`
- **AND** the printed URL ends with `:4719`

#### Scenario: Default port occupied

- **WHEN** a user runs `claude-code-tool web` on a machine where port `4719` is already bound by another process
- **THEN** the server binds to an OS-assigned ephemeral port
- **AND** the printed URL ends with that ephemeral port, not `:4719`

#### Scenario: Explicit port occupied

- **WHEN** a user runs `claude-code-tool web --port 8080` and port `8080` is already bound
- **THEN** the command exits with a non-zero status
- **AND** stderr contains a message naming the requested port and indicating it is in use

### Requirement: Browser auto-open and opt-out

By default, after the URL has been printed to stdout, the server SHALL attempt to open the URL in the system browser. When `--no-open` is supplied, the server MUST NOT attempt to open a browser. Failure to open the browser SHALL NOT terminate the server.

#### Scenario: Default invocation opens browser

- **WHEN** a user runs `claude-code-tool web` on a machine with a resolvable default browser
- **THEN** the printed URL is opened in the default browser
- **AND** the server continues running regardless of whether the browser open succeeded

#### Scenario: `--no-open` suppresses browser

- **WHEN** a user runs `claude-code-tool web --no-open`
- **THEN** no browser-open attempt is made
- **AND** the server starts and prints its URL as usual

#### Scenario: Browser-open failure is non-fatal

- **WHEN** a user runs `claude-code-tool web` on a machine where no browser is available (e.g., headless)
- **THEN** the server prints the URL, logs that the browser could not be opened, and continues accepting requests

### Requirement: Graceful shutdown on interrupt

The server SHALL shut down cleanly when the process receives `SIGINT` (Ctrl+C). It SHALL stop accepting new connections and exit with status `0`.

#### Scenario: Ctrl+C terminates the server

- **WHEN** a user presses Ctrl+C while `claude-code-tool web` is running
- **THEN** the server stops accepting new connections
- **AND** the process exits with status `0` within a short grace period
