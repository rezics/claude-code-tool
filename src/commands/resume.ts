import { defineCommand } from "citty";
import { getProjectDir } from "../utils/paths";
import { resolveSessionId } from "../utils/sessions";

export default defineCommand({
  meta: {
    name: "resume",
    description: "Resume a session by ID",
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

    console.log(`Resuming session: ${fullId}`);

    const proc = Bun.spawn(["claude", "--resume", fullId], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      cwd: process.cwd(),
    });

    const exitCode = await proc.exited;
    process.exit(exitCode);
  },
});
