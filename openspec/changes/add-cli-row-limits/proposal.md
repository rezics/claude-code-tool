## Why

As projects accumulate Claude Code sessions, two CLI outputs grow faster than the terminal can comfortably show: `list` prints one row per session (easily 100+ in large repos), and `show` prints one line per message (easily 500+ in long conversations). Users currently have no way to bound either output short of piping to `head`/`tail`, which discards the header and ordering information. Before the upcoming web UI lands, a small set of row-limit flags gives users immediate relief for the two most common "too much output" cases without adding a TUI dependency.

## What Changes

- Add `--limit <n>` and `--all` flags to the `list` command. Default behavior shows the most recent 20 sessions; `--limit` overrides the count; `--all` disables the cap entirely. **BREAKING**: bare `list` / no-subcommand invocations will no longer print every session — they print the 20 most recent. A footer line indicates when rows were omitted.
- Add `--last <n>` and `--head <n>` flags to the `show` command. When present, only the corresponding slice of the conversation timeline is rendered. Flags are mutually exclusive; without either, `show` continues to print the full timeline.
- Update the help text and README usage section to reflect the new flags and the new default cap on `list`.

## Capabilities

### New Capabilities

- `session-listing`: behavior of the `list` command — which sessions are shown, in what order, and how the output is bounded.
- `session-detail`: behavior of the `show` command — which messages from a session are rendered and how the timeline can be sliced.

### Modified Capabilities

_None — no existing specs in this project yet._

## Impact

- Affected source:
  - `src/commands/list.ts` — flag parsing, slicing after sort, footer rendering.
  - `src/commands/show.ts` — flag parsing, timeline slicing, mutual-exclusion validation.
  - `src/index.ts` — no structural change; the implicit default-run path continues to delegate to `list`.
  - `README.md` — usage examples for the new flags.
- No new runtime dependencies. `citty` already supports the argument shapes needed.
- No changes to session file formats, on-disk layout, or `resume` / `delete` commands.
- Scripts that today rely on bare `claude-code-tool list` emitting every row will need to add `--all`. This is the single BREAKING aspect.
