## 1. Dependencies and scaffolding

- [ ] 1.1 Add `marked` to `dependencies` in `package.json`; run `bun install` and commit the lockfile.
- [ ] 1.2 Create the directory layout: `src/web/server.ts`, `src/web/router.ts`, `src/web/views/`, `src/web/assets/`, `src/utils/projects.ts`, `src/utils/search.ts`.
- [ ] 1.3 Create `src/commands/web.ts` that declares the `web` subcommand (flags: `--port`, `--host`, `--no-open`) and delegates to the server module.
- [ ] 1.4 Register the `web` subcommand in `src/index.ts` alongside the existing `list` / `show` / `delete` / `resume` commands.

## 2. Project discovery

- [ ] 2.1 In `src/utils/projects.ts`, implement `listProjects()` that enumerates subdirectories of `~/.claude/projects/`, filters to those containing at least one `.jsonl`, and returns an array of `{ id: encodedName, sessionCount, lastTimestamp }` entries.
- [ ] 2.2 Implement `resolveProjectCwd(id)` that reads the first valid JSON entry from any `.jsonl` in the project directory and returns the `cwd` field, falling back to `null` when unrecoverable.
- [ ] 2.3 Memoize project discovery results in a module-level map keyed by `id`; expose `invalidateProjectCache()` for the "Refresh projects" UI action.
- [ ] 2.4 Add an `originProjectId(cwd)` helper that reuses `cwdToProjectDirName` from `src/utils/paths.ts` and returns the id iff the directory exists under `~/.claude/projects/`.

## 3. Server lifecycle and routing

- [ ] 3.1 In `src/web/server.ts`, implement `startServer({ host, port, open })` using `Bun.serve`. Default host `127.0.0.1`, default port `4719`.
- [ ] 3.2 On explicit `--port` conflict, exit with a non-zero status and a message naming the port. On default-port conflict, retry with an OS-assigned ephemeral port.
- [ ] 3.3 Print `Serving at http://<host>:<port>` to stdout before accepting requests. When `host` is non-loopback, print the documented warning message.
- [ ] 3.4 After printing the URL, when `open` is true attempt to open the system browser via a platform-appropriate command (`start` / `open` / `xdg-open`). Log and continue on failure; never error out.
- [ ] 3.5 Install a `SIGINT` handler that stops the server and exits with status `0`.

## 4. Routing and views

- [ ] 4.1 In `src/web/router.ts`, dispatch `GET /` to either a redirect to `/p/<originProjectId>` or the all-projects index, per `web-project-discovery` spec.
- [ ] 4.2 Implement `GET /projects` — the all-projects index page listing every discovered project ordered by max `lastTimestamp`.
- [ ] 4.3 Implement `GET /p/<id>` — the per-project session list, reusing `listSessions` + `getSessionSummary` from `src/utils/sessions.ts`. Render 50 rows per page; support `?cursor=<n>` or equivalent for "Load more".
- [ ] 4.4 Implement `GET /p/<id>/s/<sessionId>` — the session detail page, reusing `getSessionDetail`. Render each message's content through `marked` with HTML escaping enabled; never pass raw content through.
- [ ] 4.5 Implement `GET /search?q=&scope=&project=` — dispatch to `src/utils/search.ts` and render the result fragment.
- [ ] 4.6 Implement `POST /p/<id>/s/<sessionId>/delete` — call `deleteSession` from `src/utils/sessions.ts`; respond `204` on success and `404` (or `200` with absent-marker body) when the session has already been removed.
- [ ] 4.7 Implement `POST /projects/refresh` — call `invalidateProjectCache()` and redirect back to the referrer.
- [ ] 4.8 Add a minimal `GET /assets/htmx.min.js` and `GET /assets/app.css` handler sourcing content from `src/web/assets/` (or from inline string literals to keep `bun build --compile` single-file).

## 5. View templates

- [ ] 5.1 Create `src/web/views/layout.ts` exporting a `renderLayout({ title, body, activeProjectId? })` function that emits the `<!doctype>`-to-`</html>` shell with the navigation bar, project switcher, search box, and HTMX script tag.
- [ ] 5.2 Create `src/web/views/projects.ts` for the all-projects index.
- [ ] 5.3 Create `src/web/views/sessionList.ts` for the per-project list, including the "Load more" HTMX control.
- [ ] 5.4 Create `src/web/views/sessionDetail.ts` for the detail page, including the resume-command reveal and the delete button with `hx-confirm`.
- [ ] 5.5 Create `src/web/views/searchResults.ts` for the search fragment.
- [ ] 5.6 Add an `html` tagged-template helper (in `src/web/views/html.ts`) that escapes interpolated values by default and exposes a `raw()` marker for pre-escaped HTML.
- [ ] 5.7 Write `src/web/assets/app.css` with readable defaults for `<pre><code>`, message blocks, and the navigation bar.

## 6. Search

- [ ] 6.1 In `src/utils/search.ts`, implement `search({ query, scope, projectId? })` that returns up to 50 ranked `{ projectId, sessionId, snippets }` entries.
- [ ] 6.2 For each session, parse `.jsonl` line-by-line and check each message's text content (reusing `extractTextContent` from `src/utils/sessions.ts`) for the lowercased query substring.
- [ ] 6.3 Collect up to 3 ±40-character context snippets per session, trimmed to 80 characters total.
- [ ] 6.4 Sort results by session `lastTimestamp` descending; cap at 50 entries; mark the result set as truncated when the cap was reached.
- [ ] 6.5 Short-circuit empty queries without touching disk; return the "enter a query" fragment.

## 7. Security hardening

- [ ] 7.1 Confirm `marked` is configured with `mangle: false`, `headerIds: false`, and HTML sanitization such that `<script>` in message text cannot execute.
- [ ] 7.2 Set response headers: `Content-Security-Policy: default-src 'self'; script-src 'self'` (HTMX must be served from self for this to hold), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- [ ] 7.3 Reject `POST` requests without the expected `HX-Request` header to mitigate CSRF from browsers that loaded a malicious page on the same host.
- [ ] 7.4 When `host` is non-loopback, log each request's source address to stdout to make accidental exposure observable.

## 8. Documentation and release

- [ ] 8.1 Update `README.md` with a "Web UI" section covering `claude-code-tool web`, its flags, the loopback-only default, and the resume-in-terminal UX.
- [ ] 8.2 Add a "CLI vs Web" table to `README.md` clarifying which command to reach for — CLI for quick list / resume / scripting, web for deep reading / search / cross-project.
- [ ] 8.3 Bump `version` in `package.json` to the next minor (coordinated with `add-cli-row-limits`).

## 9. Manual verification

- [ ] 9.1 Run `bun run bin/cli.ts web` in a project with existing sessions; confirm the URL prints, the browser opens, and `/` redirects to the current project's list.
- [ ] 9.2 In the browser, open a long session; confirm markdown renders, code blocks preserve whitespace, and a message containing `<script>alert(1)</script>` does NOT execute the script.
- [ ] 9.3 Use the search box on a project page; confirm case-insensitive substring matching, multiple snippets per session, and "Search all projects" returning interleaved results.
- [ ] 9.4 Click "Refresh projects" after creating a new session in a different project; confirm the new project appears.
- [ ] 9.5 Delete a session from the web UI; confirm its `.jsonl` (and `.jsonl.wakatime`, if any) are gone from `~/.claude/projects/...` and the row is removed from the UI.
- [ ] 9.6 Copy the resume command; paste into a terminal; confirm it runs `claude --resume <id>` successfully.
- [ ] 9.7 Run `bun run bin/cli.ts web --port 4719` twice in two shells; confirm the second instance fails fast with a clear message.
- [ ] 9.8 Run `bun run bin/cli.ts web --host 0.0.0.0`; confirm the warning appears before the URL is usable.
- [ ] 9.9 Run `bun run bin/cli.ts web --no-open`; confirm no browser launches but the server runs.
- [ ] 9.10 Press Ctrl+C; confirm clean shutdown with exit status `0`.
