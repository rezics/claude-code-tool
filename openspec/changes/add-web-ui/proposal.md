## Why

Sessions in large projects easily pass 100 per project and hundreds of messages per session. The terminal is the wrong surface for two workflows that are becoming daily: reading a long conversation end-to-end with code blocks rendered, and searching for a phrase across many sessions. A local web UI lets those workflows happen where they're naturally comfortable — rendered markdown, resizable panes, browser find-in-page, back/forward history — while keeping the CLI as the fast, scriptable path for quick ops and `resume`.

## What Changes

- Add a new `web` subcommand that starts a local HTTP server bound to `127.0.0.1` on a default port, then (by default) opens the system browser to that port.
- Serve a minimal HTML UI (server-rendered, no build step, HTMX for progressive enhancement) covering:
  - a project switcher defaulting to the project matching the current working directory
  - a paged / infinitely-scrolling session list per project
  - a session detail view that renders every message in full with markdown and fenced code blocks
  - a search box scoped to the current project or to all projects
  - a "resume" affordance that reveals and copies the `claude --resume <id>` command (CLI retains the terminal-owning path)
  - a delete affordance with confirmation
- Discover projects by enumerating subdirectories of `~/.claude/projects/` and recovering each project's original `cwd` from the first entry of any session file (the directory name encoding is lossy).
- Add `--port <n>`, `--no-open`, and `--host <addr>` flags to the `web` subcommand. `--host` defaults to `127.0.0.1` and SHOULD be constrained to loopback addresses to avoid accidental LAN exposure.
- Do not change the default no-subcommand behavior — `claude-code-tool` continues to run `list`. Web is opt-in via the explicit `web` subcommand.

## Capabilities

### New Capabilities

- `web-server`: the HTTP server lifecycle, flag parsing, host binding, port selection, and browser-open behavior.
- `web-project-discovery`: enumerating projects from `~/.claude/projects/`, recovering original `cwd` from session content, and mapping the current working directory to a project on server start.
- `web-session-browsing`: per-project session list and session detail pages, including pagination, rendering of markdown / code, and resume / delete affordances.
- `web-search`: full-text search across sessions, scoped to one project or to all projects, with result ranking by recency and match count.

### Modified Capabilities

_None — no existing specs in this project yet._

## Impact

- New source:
  - `src/commands/web.ts` — subcommand entry (flag parsing, server startup, browser open).
  - `src/web/server.ts` — `Bun.serve` request routing.
  - `src/web/views/*.ts` — string-template HTML views (list, detail, search, project picker, layout).
  - `src/web/assets/*` — a single HTMX script and any static CSS, either inlined or served from an embedded map.
  - `src/utils/projects.ts` — project enumeration and `cwd` recovery helpers.
  - `src/utils/search.ts` — linear-scan full-text search over `.jsonl` files.
- Modified source:
  - `src/index.ts` — register the new subcommand.
  - `README.md` — document `web`, its flags, and the "what goes in web vs CLI" split.
  - `package.json` — add the minimum markdown-rendering dependency (decision in `design.md`).
- No change to how sessions are stored, parsed, or resumed.
- No change to the `list` / `show` / `delete` / `resume` subcommands in this change; any CLI-side pagination is handled by the parallel `add-cli-row-limits` change.
- Network surface: loopback only. Session contents include user prompts and code and must not be exposed off-host; the design pins `--host` to loopback by default and documents the risk of overriding it.
