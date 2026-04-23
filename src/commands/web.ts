import { defineCommand } from "citty";
import { startServer } from "../web/server";

const DEFAULT_PORT = 4719;
const DEFAULT_HOST = "127.0.0.1";

export default defineCommand({
  meta: {
    name: "web",
    description:
      "Start a local web UI for browsing, searching, and managing Claude Code sessions",
  },
  args: {
    port: {
      type: "string",
      description: `Port to bind (default: ${DEFAULT_PORT}; auto-selects if busy and not explicit)`,
      alias: "p",
    },
    host: {
      type: "string",
      description: `Host/interface to bind (default: ${DEFAULT_HOST})`,
    },
    "no-open": {
      type: "boolean",
      description: "Do not attempt to open the system browser",
    },
  },
  run: async ({ args }) => {
    const host = typeof args.host === "string" && args.host.length > 0
      ? args.host
      : DEFAULT_HOST;

    let port = DEFAULT_PORT;
    let portExplicit = false;
    if (args.port !== undefined) {
      const parsed = Number(args.port);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
        console.error(
          `Error: --port must be an integer between 0 and 65535 (got "${args.port}").`
        );
        process.exit(1);
      }
      port = parsed;
      portExplicit = true;
    }

    const open = args["no-open"] !== true;

    await startServer({ host, port, open, portExplicit });
  },
});
