# claude-code-tool

A CLI *and* local web UI for managing Claude Code sessions. Built with [citty](https://github.com/unjs/citty), [Bun](https://bun.sh), and [HTMX](https://htmx.org).

The CLI maps the current working directory to its corresponding Claude Code project and gives you an overview of all sessions with summaries. The `web` subcommand starts a loopback-only HTTP server with a browsable UI — useful for reading long conversations with rendered markdown, searching across sessions, and cross-project navigation.

## CLI vs Web

| Task                          | Reach for     |
| ----------------------------- | ------------- |
| Quick glance at recent work   | `list`        |
| One-line summaries in scripts | `list --all`  |
| Resume a session in terminal  | `resume <id>` |
| Delete one session            | `delete <id>` |
| Read a long conversation      | `web`         |
| Search across sessions        | `web`         |
| Jump between projects         | `web`         |

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed (for the `resume` command)

## Installation

```bash
# Bun
bun add -g claude-code-tool

# npm
npm install -g claude-code-tool

# pnpm
pnpm add -g claude-code-tool

# Yarn (Classic v1)
yarn global add claude-code-tool

# Yarn (Berry v2+)
yarn dlx claude-code-tool
```

After installing, `claude-code-tool` is available globally.

## Usage

Navigate to any project directory that has Claude Code sessions, then:

### List sessions (default)

```bash
claude-code-tool
# or
claude-code-tool list
```

Shows the 20 most recent sessions by default. A footer line names the number of rows omitted when more exist.

```bash
# Custom window (short form: -n)
claude-code-tool list --limit 50

# Print every session, no cap
claude-code-tool list --all
```

### Show a session

```bash
claude-code-tool show <sessionId>

# Tail of a long conversation
claude-code-tool show <sessionId> --last 30

# First few messages only
claude-code-tool show <sessionId> --head 10
```

`--last` and `--head` are mutually exclusive. Rendered indices stay 1-based against the full timeline so a sliced view can be cross-referenced with an unsliced one.

### Tips

```
> claude-code-tool --help
Manage Claude Code sessions for the current project (claude-code-tool v0.2.0)

USAGE claude-code-tool list|show|delete|resume

COMMANDS

    list    List all sessions for the current project
    show    Show detailed information about a session
  delete    Delete a session by ID
  resume    Resume a session by ID

Use claude-code-tool <command> --help for more information about a command.
```

Displays sessions with ID, slug, branch, message count, date, and a summary of the first user message.

### Upgrading from 0.1.x

`list` now caps output at the 20 most recent sessions by default. Scripts that depended on bare `claude-code-tool list` emitting every row must now pass `--all`:

```bash
# Previous behavior (pre-0.2.0)
claude-code-tool list

# Equivalent in 0.2.0+
claude-code-tool list --all
```

### Delete a session

```bash
claude-code-tool delete <sessionId>
```

Accepts a full UUID or an 8-character prefix (as shown in the `list` output).

### Resume a session

```bash
claude-code-tool resume <sessionId>
```

Launches `claude --resume <sessionId>` with full terminal control.

### Web UI

```bash
claude-code-tool web
# → Serving at http://127.0.0.1:4719
```

Starts a local HTTP server (loopback-only by default) and opens your browser. Features:

- **Projects index** — every project discovered under `~/.claude/projects/`, ordered by most recent activity. Click to drill in.
- **Per-project session list** — 50 sessions per page with a "Load more" button; markdown-rendered summaries.
- **Session detail** — every message in full, with fenced code blocks rendered in `<pre><code>`. Message content is HTML-escaped before markdown parsing; `<script>` in user content cannot execute.
- **Search** — case-insensitive substring search across session contents, scoped to the current project by default or widened to "all projects". Up to 50 ranked results with ±40-char context snippets.
- **Resume in terminal** — each session detail page shows a copy-to-clipboard `claude --resume <id>` command. (The web UI does not spawn terminals; use the CLI `resume` for that.)
- **Delete** — per-row or from session detail, with an HTMX confirmation prompt. Uses the same deletion logic as the CLI.
- **Refresh projects** — a small ↻ control in the top bar busts the in-memory project cache after you create a new session outside the server's original view.

#### Flags

```bash
claude-code-tool web --port 8080      # explicit port (fails fast if busy)
claude-code-tool web --host 0.0.0.0   # expose on LAN (prints a warning)
claude-code-tool web --no-open        # don't launch the browser
```

- Default host is `127.0.0.1`. Overriding to a non-loopback address prints a warning because session contents may include source code and sensitive discussions.
- Default port is `4719`. If busy and you did NOT pass `--port`, the server picks an ephemeral port. If you DID pass `--port` and it's busy, the server exits non-zero.
- Press Ctrl+C for a clean shutdown.

The server has no authentication. Do not expose it on a network you don't control.

### Help

```bash
claude-code-tool --help
```

## Development

```bash
# Install dependencies
bun install

# Link as global command for testing
bun link

# After linking, `claude-code-tool` is available globally.
# Then run in some claude code project directory

claude-code-tool

# Run directly without linking
bun run bin/cli.ts
bun run bin/cli.ts list
bun run bin/cli.ts delete <id>
bun run bin/cli.ts resume <id>
bun run bin/cli.ts web
```
