## ADDED Requirements

### Requirement: Tail slice of session timeline

The `show` command SHALL accept a `--last <n>` flag that, when present, causes only the last `n` messages of the conversation timeline to be rendered in place of the full timeline. The session header block (ID, slug, branch, counts, first user message) SHALL always be rendered in full regardless of the flag. When the session has fewer than `n` non-meta messages, all available messages SHALL be rendered without error. The flag SHALL require a positive integer; zero and negative values SHALL cause the command to exit with a non-zero status and a descriptive error.

#### Scenario: Session has more messages than requested tail

- **WHEN** a user runs `claude-code-tool show <id> --last 30` on a session with 200 messages in the timeline
- **THEN** the header block is rendered in full
- **AND** exactly 30 messages are rendered in the timeline section, corresponding to messages 171 through 200
- **AND** each rendered message retains its original index (e.g., `171.`, `172.`, ...) so it can be cross-referenced with an unsliced view

#### Scenario: Session has fewer messages than requested tail

- **WHEN** a user runs `claude-code-tool show <id> --last 30` on a session with 12 messages in the timeline
- **THEN** all 12 messages are rendered in the timeline section with their original indices (`1.` through `12.`)
- **AND** no warning or error is emitted

#### Scenario: Invalid tail value

- **WHEN** a user runs `claude-code-tool show <id> --last 0`
- **THEN** the command exits with a non-zero status
- **AND** stderr contains a message explaining that `--last` must be a positive integer

### Requirement: Head slice of session timeline

The `show` command SHALL accept a `--head <n>` flag that, when present, causes only the first `n` messages of the conversation timeline to be rendered in place of the full timeline. The session header block SHALL always be rendered in full. Semantics for out-of-range and invalid values SHALL mirror `--last`.

#### Scenario: Session has more messages than requested head

- **WHEN** a user runs `claude-code-tool show <id> --head 10` on a session with 200 messages
- **THEN** exactly 10 messages are rendered in the timeline section, corresponding to messages 1 through 10
- **AND** each rendered message retains its original index

### Requirement: Mutual exclusion of timeline slicing flags

The `show` command SHALL reject invocations that supply both `--last` and `--head`. When both are supplied, the command SHALL exit with a non-zero status before reading any session file.

#### Scenario: User supplies both head and last

- **WHEN** a user runs `claude-code-tool show <id> --last 10 --head 10`
- **THEN** the command exits with a non-zero status
- **AND** stderr contains a message naming both flags and stating that only one may be used per invocation
- **AND** no session file is read from disk

### Requirement: Default show behavior is unchanged

When neither `--last` nor `--head` is supplied, the `show` command SHALL render the full conversation timeline, preserving the behavior that existed before this change.

#### Scenario: No slicing flag supplied

- **WHEN** a user runs `claude-code-tool show <id>` on a session with 200 messages
- **THEN** all 200 messages are rendered in the timeline section, indexed `1.` through `200.`
