import { defineCommand } from "citty";
import { getProjectDir } from "../utils/paths";
import { resolveSessionId, getSessionDetail } from "../utils/sessions";

export default defineCommand({
  meta: {
    name: "show",
    description: "Show detailed information about a session",
  },
  args: {
    sessionId: {
      type: "positional",
      description: "Session ID (full UUID or prefix)",
      required: true,
    },
  },
  run: async ({ args }) => {
    const projectDir = getProjectDir();
    const fullId = resolveSessionId(projectDir, args.sessionId);
    const detail = await getSessionDetail(projectDir, fullId);

    const formatDate = (ts: string | null) =>
      ts ? new Date(ts).toISOString().slice(0, 19).replace("T", " ") : "unknown";

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Header
    console.log(`\nSession: ${detail.sessionId}`);
    console.log(`Slug:    ${detail.slug ?? "(none)"}`);
    console.log(`Branch:  ${detail.gitBranch ?? "(none)"}`);
    console.log(`Started: ${formatDate(detail.timestamp)}`);
    console.log(`Last:    ${formatDate(detail.lastTimestamp)}`);
    console.log(
      `Messages: ${detail.messageCount} total (${detail.userMessageCount} user, ${detail.assistantMessageCount} assistant)`
    );
    console.log(`Size:    ${formatSize(detail.fileSizeBytes)}`);

    // First user message
    console.log(`\n--- First User Message ---\n`);
    console.log(detail.firstUserMessage || "(empty)");

    // Conversation timeline
    if (detail.messages.length > 0) {
      console.log(`\n--- Conversation Timeline (${detail.messages.length} messages) ---\n`);
      for (let i = 0; i < detail.messages.length; i++) {
        const msg = detail.messages[i];
        const time = msg.timestamp
          ? new Date(msg.timestamp).toISOString().slice(11, 19)
          : "??:??:??";
        const role = msg.role === "user" ? "USER" : "ASST";
        console.log(`  ${String(i + 1).padStart(3)}. [${time}] ${role}: ${msg.preview}`);
      }
    }

    console.log();
  },
});
