## Context

`claude-code-tool` is a thin (~250 LOC) CLI built on `citty` and Bun. Its two browsing commands (`list`, `show`) currently emit unbounded output: every session in the project for `list`, every message in the conversation for `show`. A parallel change (`add-web-ui`) will introduce a web mode for deep browsing. This change is intentionally scoped as the small, immediate fix that keeps the CLI usable while the web UI is being built, and remains useful afterward as the fast, scriptable path.

## Goals / Non-Goals

**Goals:**

- Bound `list` output by default without losing the "most recent first" ordering users already rely on.
- Let users request the head or tail of a long session without piping to `head`/`tail` (which would strip the formatted header and renumber timeline indices).
- Introduce zero new runtime dependencies. No TUI library, no pager integration.
- Stay compatible with pipelines: output remains line-oriented and grep-friendly.

**Non-Goals:**

- Interactive pagination, arrow-key navigation, or any TUI surface.
- Full-text search within or across sessions (lives in the web UI).
- Cross-project browsing (lives in the web UI).
- Changing the `delete` or `resume` commands.
- Persisting user preferences (default limit is a compile-time constant, not configurable via env or rc file in this change).

## Decisions

### Default `list` limit: 20, not "unlimited"

Picking 20 rather than `--limit` being opt-in. Rationale: a user with 100+ sessions running `claude-code-tool` today gets a wall of text and has to re-run with a flag to make it usable. An opt-in cap means the first invocation is always the bad one. 20 fits comfortably on a typical terminal with the existing column widths. Users who want the old behavior write `--all` once.

Alternative considered: keep default unlimited, add `--limit` opt-in. Rejected because the whole point of this change is that unbounded output is the pain, and the web UI — not `--all` — is the answer for "I want to see everything."

### Flag shapes mirror GNU conventions

- `--limit <n>` / `-n <n>` on `list` (short form matches `head -n`)
- `--all` / `-a` on `list`
- `--last <n>` / `--head <n>` on `show`, mutually exclusive

`--limit` over `--page`: this change is not building stateful pagination. There is no "page 2" because the user can re-run with a larger `--limit` or jump to the web UI. Adding `--page` now would force a data model (offsets, page size defaults) we don't need.

### Slicing happens after sort, not during read

`list` already loads every session summary (O(n) file reads) to sort by `lastTimestamp`. The limit is applied to the final sorted array. This keeps the "most recent N" semantics correct and avoids any heuristic about which files to read. If session counts ever grow to a point where reading every file is too slow, that's a separate optimization (index file, metadata cache) — not addressed here.

### `--last` / `--head` semantics for `show`

Both operate on the already-filtered `detail.messages` array (which excludes meta entries). `--last N` keeps the last N entries and preserves their original numeric indices in the timeline output so users can cross-reference with `--head` runs. `--head N` keeps the first N.

### Breaking change acknowledged, not softened

Changing the default from "print all" to "print 20" is technically breaking for any script reading the bare output. Mitigations considered:

- Env var `CCT_LEGACY=1`: adds a config surface we'd have to maintain forever.
- Deprecation warning for one release: this tool is at 0.1.x; semver allows the break.

Chosen: ship the break, document `--all` prominently, note it in the proposal's **BREAKING** marker. The user base is small enough and the migration (one flag) is trivial enough.

## Risks / Trade-offs

- **[Users with pipelines relying on full list output see silent truncation]** → Footer line `N sessions shown (M more, use --all)` makes truncation visible; README example updated to show `--all` for scripting.
- **[`--last N` on a session with fewer than N messages]** → Show all available messages, no error. Matches `tail -n` behavior; no scenario needs a warning.
- **[User passes both `--last` and `--head`]** → Fail fast with a clear error via citty's arg validation; no fallback priority.
- **[Default of 20 feels arbitrary]** → It is. Encoded as a named constant in `list.ts` so changing it later is a one-line edit without a config surface.

## Migration Plan

No data migration. Shipping with the next minor version bump (0.2.0) communicates the break. README gets an "Upgrading from 0.1.x" note calling out `--all` for scripts.
