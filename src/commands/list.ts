import { defineCommand } from "citty";
import { getProjectDir } from "../utils/paths";
import { listSessions, getSessionSummary } from "../utils/sessions";

const DEFAULT_LIST_LIMIT = 20;

export default defineCommand({
  meta: {
    name: "list",
    description: "List all sessions for the current project",
  },
  args: {
    limit: {
      type: "string",
      description: `Maximum number of sessions to show (default: ${DEFAULT_LIST_LIMIT})`,
      alias: "n",
    },
    all: {
      type: "boolean",
      description: "Show all sessions without any row cap",
      alias: "a",
    },
  },
  run: async ({ args }) => {
    const showAll = args.all === true;
    let limit = DEFAULT_LIST_LIMIT;
    if (!showAll && args.limit !== undefined) {
      const parsed = Number(args.limit);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        console.error(
          `Error: --limit must be a positive integer (got "${args.limit}").`
        );
        process.exit(1);
      }
      limit = parsed;
    }

    const projectDir = getProjectDir();
    const sessionIds = listSessions(projectDir);

    if (sessionIds.length === 0) {
      console.log("No sessions found for this project.");
      return;
    }

    const summaries = await Promise.all(
      sessionIds.map((id) => getSessionSummary(projectDir, id))
    );

    // Sort by timestamp descending (most recent first)
    summaries.sort((a, b) => {
      const ta = a.lastTimestamp ?? a.timestamp ?? "";
      const tb = b.lastTimestamp ?? b.timestamp ?? "";
      return tb.localeCompare(ta);
    });

    const total = summaries.length;
    const rows = showAll ? summaries : summaries.slice(0, limit);
    const omitted = total - rows.length;

    // Header
    console.log(
      padRight("ID", 10) +
        padRight("Slug", 28) +
        padRight("Branch", 12) +
        padRight("Msgs", 6) +
        padRight("Date", 18) +
        "Summary"
    );
    console.log("-".repeat(110));

    for (const s of rows) {
      const date = s.timestamp
        ? new Date(s.timestamp).toISOString().slice(0, 16).replace("T", " ")
        : "unknown";
      const summary = s.firstUserMessage || "(empty session)";

      console.log(
        padRight(s.sessionId.slice(0, 8), 10) +
          padRight(s.slug ?? "(no slug)", 28) +
          padRight(s.gitBranch ?? "-", 12) +
          padRight(String(s.messageCount), 6) +
          padRight(date, 18) +
          summary.slice(0, 60)
      );
    }

    if (omitted > 0) {
      console.log(
        `\n${rows.length} of ${total} session(s) — ${omitted} hidden, use --all to show all.`
      );
    } else {
      console.log(`\n${total} session(s) total.`);
    }
  },
});

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len - 1) + " " : str + " ".repeat(len - str.length);
}
