## Context

The existing CLI is ~250 LOC with one runtime dependency (`citty`). Adding a web UI is a material expansion in surface area, but the project's goals remain "small, fast, does one thing well." The design's guiding principle is to match that character: no build step, minimum dependencies, single-binary distribution, and a sharp split between what the web handles (deep browsing, search, cross-project) and what the CLI handles (quick glance, resume, scripting).

The parallel change `add-cli-row-limits` is already shaping CLI output for the "still want a terminal" case. This change does not need to re-solve pagination for the CLI.

## Goals / Non-Goals

**Goals:**

- Let a user open a local web UI with `claude-code-tool web` and browse the current project's sessions in under a second.
- Let the user navigate to any other project discovered under `~/.claude/projects/` and to a global search surface.
- Render message content in full with markdown and fenced code blocks, so long Claude sessions are comfortably readable.
- Keep the web layer dependency-light and build-step-free — no React, no Vite, no bundler.
- Keep all network traffic on loopback by default; make cross-host serving possible only via an explicit flag and document the risk.

**Non-Goals:**

- A PWA, authentication, or multi-user access.
- A persistent database or search index. Storage is the existing `.jsonl` files plus an in-memory cache.
- Real-time session streaming (watching a session as Claude writes to it). Refresh-on-load is enough for a browsing tool.
- Embedded terminal / xterm.js for running `claude --resume` inside the browser.
- Any change to CLI commands — `list` / `show` / `delete` / `resume` are untouched by this change.
- Mobile-specific UI tuning. Desktop is the target.

## Decisions

### Server: `Bun.serve` directly, no framework

`Bun.serve` handles routing via a path matcher sufficient for the ~10 routes this app needs. Adding `hono` or `express` would save ~20 lines of routing boilerplate at the cost of a dependency and an onboarding concept. Rejected.

### Views: server-rendered string templates + HTMX, no React / no JSX runtime

Views are plain TypeScript functions returning HTML strings (with a tiny `html` tagged template for escaping). HTMX, loaded from a CDN-style URL or inlined as a static asset, provides partial page swaps for search, pagination, and project switching. This avoids a bundler, a client-side router, and hydration logic entirely. The tradeoff is a less ergonomic component model; that tradeoff is right-sized for a tool with a ~10-screen surface area.

Alternative considered: React SPA served by Bun. Rejected because the dependency delta (react + react-dom + vite + esbuild + a bundler pipeline) is larger than the entire current project.

### Markdown rendering: one dependency, `marked`

`marked` is ~40KB, has zero runtime deps, and renders CommonMark plus fenced code. It's the minimum viable way to render Claude messages acceptably. Syntax highlighting is deferred — `<pre><code>` with readable monospace CSS is the v1 target.

Alternative considered: writing a small markdown renderer inline. Rejected — escaping, fenced-code fences, list nesting, and link handling are enough edge cases that hand-rolling is false economy.

Alternative considered: `shiki` for syntax highlighting. Deferred — large dep, first-screen cost, not essential for v1. Revisit if readability demands it.

### Project discovery: enumerate on startup, recover `cwd` from session content

`~/.claude/projects/<encoded>` encoding is lossy (both `.` and `/` collapse to `-`), so we cannot reverse the directory name into a real path. Instead, on the first request that needs project metadata we read the first valid JSON entry from any `.jsonl` in each project directory and take its `cwd` field. The result is cached in memory for the server's lifetime. If a project directory contains no readable session (edge case), we fall back to displaying the encoded directory name and flagging it in the UI.

### Matching the current working directory to a project

On server start we compute `cwdToProjectDirName(process.cwd())` (reusing the existing util) and redirect the bare `/` route to `/p/<that-name>`. If the directory doesn't exist under `~/.claude/projects/`, `/` renders the "all projects" index instead — the user invoked `web` from somewhere without sessions, which is a reasonable place to land on the global view.

### Search: linear scan, no index

A project with 100 sessions averages ~50MB of `.jsonl` on disk. Bun reads that in well under a second. First-version search is:

1. Parse the query (just a lowercased substring for v1; no boolean ops)
2. Stream through every `.jsonl` in scope
3. For each message, check if content contains the query
4. Collect match contexts (±40 chars), sort by session `lastTimestamp` desc, return top N

No prefix index, no FTS. If query latency ever becomes unacceptable on someone's machine, the follow-up is `bun:sqlite` FTS5 (Bun-native, zero npm dependency).

### Port selection: fixed default, fall back to random on conflict

Default port is `4719` (arbitrary, but stable so the URL is familiar). If the port is in use, the server asks the OS for an ephemeral port and uses that instead, printing the actual URL to stdout. Users who need determinism pass `--port <n>` and accept the failure mode if it's busy.

### Host binding: loopback by default, explicit override

Default `--host 127.0.0.1`. A user can pass `--host 0.0.0.0` to expose on LAN; when they do, we print a prominent warning to stdout: "Session contents may include source code and sensitive discussions. Expose only on trusted networks." No authentication is implemented — if users need LAN access with auth, they can tunnel.

### Resume in web: copy-to-clipboard, not terminal spawn

The session detail page shows a `Resume in terminal: claude --resume <id>` block with a one-click copy button (uses the browser Clipboard API). Rationale: reliably spawning an interactive terminal with proper TTY across Windows / macOS / Linux from a browser context is a nightmare, and the existing `claude-code-tool resume` CLI already handles terminal ownership correctly. The web surface should route users to the CLI for this one action rather than re-implement it badly.

### Deletion in web: POST + HTMX confirm, same server-side logic as CLI

Deletion reuses `deleteSession()` from `src/utils/sessions.ts`. The UI uses an HTMX `hx-post` with an `hx-confirm` prompt and removes the row from the DOM on 204 response. No soft delete, no undo — matches CLI behavior exactly.

### Distribution: single-file binary via `bun build --compile`

HTMX and CSS are inlined into TypeScript string literals (or `import`ed as text via Bun's loader), so `bun build --compile --target=bun` produces a single executable with no sibling assets. `marked` compiles in cleanly. This preserves the project's "one file, drop it on PATH" distribution story.

## Risks / Trade-offs

- **[Session contents leak on LAN if a user overrides `--host`]** → Loopback default, prominent runtime warning when overridden, documented in README.
- **[Markdown renderer XSS via hostile message content]** → `marked` defaults to escaping HTML in output; we do not enable `mangle: false` or raw HTML passthrough. Double-check sanitization in the design-to-implementation step.
- **[Memory bloat from large `.jsonl` files read in-full per request]** → For v1 acceptable. If a single session passes 50MB, consider streaming the detail view with range reads. Not addressed now.
- **[Project-discovery cache goes stale when the user creates a new session in a different project while the server runs]** → Provide a "Refresh projects" link that busts the cache. Also invalidate on explicit project-switch navigation.
- **[`marked` dependency adds first real npm footprint]** → Acceptable. Project gains enough capability that the one-dep cost is well-justified.
- **[Search latency on very large archives]** → Acceptable for v1. Deferred optimization path documented above (bun:sqlite FTS5).
- **[Browser does not auto-open on headless / WSL machines]** → `--no-open` always works; on auto-open failure we log the URL and continue rather than erroring. The server running is what matters.
- **[Port 4719 is arbitrary and may conflict on some user machines]** → Ephemeral fallback handles it; explicit `--port` available for determinism.

## Migration Plan

No data migration. Shipping alongside the `add-cli-row-limits` change as the `0.2.0` release or the next minor after it. README grows a new "Web UI" section and a "CLI vs Web" table clarifying the split.

## Open Questions

- Syntax highlighting: is `<pre><code>` with CSS enough for v1, or is `shiki` worth the weight on day one? Current plan: defer.
- Global search default scope: does the search box default to "this project" or "all projects"? Current plan: this project, with an explicit "Search all projects" toggle in the UI.
- Project-list sort order: most-recent-activity first vs. alphabetical? Current plan: most-recent-activity first, with the metric being the max `lastTimestamp` across that project's sessions.
