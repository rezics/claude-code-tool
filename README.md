# claude-code-tool

A CLI tool to manage local Claude Code sessions. Built with [citty](https://github.com/unjs/citty) and [Bun](https://bun.sh).

Automatically detects your OS and maps the current working directory to its corresponding Claude Code project, giving you an overview of all sessions with summaries.

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

### Tips

```
> claude-code-tool --help
Manage Claude Code sessions for the current project (claude-code-tool v0.1.0)

USAGE claude-code-tool list|show|delete|resume

COMMANDS

    list    List all sessions for the current project
    show    Show detailed information about a session
  delete    Delete a session by ID
  resume    Resume a session by ID

Use claude-code-tool <command> --help for more information about a command.
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

# After linking, `claude-code-tool` is available globally.
# Then run in some claude code project directory

claude-code-tool

# Run directly without linking
bun run bin/cli.ts
bun run bin/cli.ts list
bun run bin/cli.ts delete <id>
bun run bin/cli.ts resume <id>
```
