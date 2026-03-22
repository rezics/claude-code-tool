import { defineCommand } from "citty";
import { getProjectDir } from "../utils/paths";
import { resolveSessionId, deleteSession } from "../utils/sessions";

export default defineCommand({
  meta: {
    name: "delete",
    description: "Delete a session by ID",
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

    deleteSession(projectDir, fullId);
    console.log(`Deleted session: ${fullId}`);
  },
});
