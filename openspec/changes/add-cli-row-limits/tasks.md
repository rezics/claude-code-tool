## 1. `list` command flags

- [x] 1.1 Declare a named constant `DEFAULT_LIST_LIMIT = 20` at the top of `src/commands/list.ts`.
- [x] 1.2 Add `--limit` (alias `-n`, type `string` parsed to positive integer) and `--all` (alias `-a`, type `boolean`) to the `args` object in `src/commands/list.ts`.
- [x] 1.3 After the existing `summaries.sort(...)` call, apply the row cap: if `--all` is set, keep all rows; else parse `--limit` (falling back to `DEFAULT_LIST_LIMIT` if absent) and slice `summaries` to that length.
- [x] 1.4 Validate `--limit` is a positive integer; on failure, write an explanatory message to `stderr` and exit with a non-zero status before any further work.
- [x] 1.5 Update the footer in `src/commands/list.ts`: when rows were omitted, print `{shown} of {total} session(s) — {omitted} hidden, use --all to show all.`; otherwise keep the existing `{total} session(s) total.` line.

## 2. `show` command flags

- [x] 2.1 Add `--last` and `--head` (both type `string` parsed to positive integer) to the `args` object in `src/commands/show.ts`.
- [x] 2.2 Before reading any session file, reject invocations that supply both `--last` and `--head` by writing an explanatory message naming both flags to `stderr` and exiting with a non-zero status.
- [x] 2.3 Validate each flag independently is a positive integer when present; on failure write an explanatory message to `stderr` and exit with a non-zero status.
- [x] 2.4 In the timeline-rendering loop, when `--last N` is set render only the final `N` entries of `detail.messages`; when `--head N` is set render only the first `N`. In both cases, the printed index MUST be the original 1-based position within the full `detail.messages` array, not a re-numbered index within the slice.
- [x] 2.5 Ensure the header block (session ID / slug / branch / counts / first user message) is always rendered in full regardless of slicing flags.

## 3. Documentation

- [x] 3.1 Update `README.md` usage section with examples for `list --limit`, `list --all`, `show --last`, `show --head`.
- [x] 3.2 Add an "Upgrading from 0.1.x" subsection to `README.md` noting the new default cap on `list` and showing `--all` for scripts that relied on full output.
- [x] 3.3 Bump `version` in `package.json` from `0.1.1` to `0.2.0` (minor bump reflects the BREAKING default change).

## 4. Manual verification

- [x] 4.1 Run `bun run bin/cli.ts` in a project with >20 sessions — confirm 20 rows printed and footer names the hidden count.
- [x] 4.2 Run `bun run bin/cli.ts list --all` — confirm all rows printed and footer does not mention omitted rows.
- [x] 4.3 Run `bun run bin/cli.ts list --limit 5` — confirm exactly 5 rows printed.
- [x] 4.4 Run `bun run bin/cli.ts list --limit 0` — confirm non-zero exit and clear error.
- [x] 4.5 Run `bun run bin/cli.ts show <id> --last 5` on a long session — confirm only last 5 messages printed and their indices match an unsliced run.
- [x] 4.6 Run `bun run bin/cli.ts show <id> --head 3` — confirm only first 3 messages printed with original indices.
- [x] 4.7 Run `bun run bin/cli.ts show <id> --last 5 --head 5` — confirm non-zero exit and clear error before any disk read.
- [x] 4.8 Run `bun run bin/cli.ts --help` and `bun run bin/cli.ts list --help` — confirm new flags appear in generated help output.
