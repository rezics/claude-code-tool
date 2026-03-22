# claude-code-tool

A CLI tool to manage local Claude Code sessions. Built with [citty](https://github.com/unjs/citty) and [Bun](https://bun.sh).

Automatically detects your OS and maps the current working directory to its corresponding Claude Code project, giving you an overview of all sessions with summaries.

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed (for the `resume` command)

## Installation

```bash
bun install
bun link
```

After linking, `claude-code-tool` is available globally.

## Usage

Navigate to any project directory that has Claude Code sessions, then:

### List sessions (default)

```bash
claude-code-tool
# or
claude-code-tool list
```

Displays all sessions with ID, slug, branch, message count, date, and a summary of the first user message.

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

# Run directly without linking
bun run bin/cli.ts
bun run bin/cli.ts list
bun run bin/cli.ts delete <id>
bun run bin/cli.ts resume <id>
```
