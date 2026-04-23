import { handleRequest, type RouterContext } from "./router";

export interface StartServerOptions {
  host: string;
  port: number;
  open: boolean;
  portExplicit: boolean;
}

const LOOPBACK_ADDRESSES = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
  "0:0:0:0:0:0:0:1",
]);

function isLoopback(host: string): boolean {
  return LOOPBACK_ADDRESSES.has(host.toLowerCase());
}

function isPortInUseError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "EADDRINUSE") return true;
  const message = (err as Error).message ?? "";
  return /EADDRINUSE|address already in use/i.test(message);
}

function openBrowser(url: string): void {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      Bun.spawn(["cmd", "/c", "start", "", url], {
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
    } else if (platform === "darwin") {
      Bun.spawn(["open", url], {
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
    } else {
      Bun.spawn(["xdg-open", url], {
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
    }
  } catch (err) {
    console.log(
      `Could not open browser automatically (${(err as Error).message}). Visit the URL above.`
    );
  }
}

async function tryServe(
  host: string,
  port: number,
  context: RouterContext
): Promise<Bun.Server<unknown>> {
  const server = Bun.serve({
    hostname: host,
    port,
    fetch(req, s) {
      return handleRequest(req, s, context);
    },
    error(err) {
      console.error("Server error:", err);
      return new Response("Internal server error", { status: 500 });
    },
  });
  return server;
}

export async function startServer(opts: StartServerOptions): Promise<void> {
  const loopback = isLoopback(opts.host);
  const hostWarn = !loopback;
  const context: RouterContext = { hostWarn };

  let server: Bun.Server<unknown>;
  try {
    server = await tryServe(opts.host, opts.port, context);
  } catch (err) {
    if (isPortInUseError(err)) {
      if (opts.portExplicit) {
        console.error(
          `Error: port ${opts.port} is already in use. Pass --port <n> with a free port or omit --port to auto-select.`
        );
        process.exit(1);
      }
      console.log(
        `Port ${opts.port} is already in use; selecting an ephemeral port.`
      );
      server = await tryServe(opts.host, 0, context);
    } else {
      throw err;
    }
  }

  const port = server.port;
  const displayHost = opts.host === "0.0.0.0" ? "127.0.0.1" : opts.host;
  const url = `http://${displayHost}:${port}`;

  if (hostWarn) {
    console.log(
      `WARNING: binding to ${opts.host}. Session contents may include source code and sensitive discussions. Expose only on trusted networks.`
    );
  }
  console.log(`Serving at http://${opts.host}:${port}`);
  if (hostWarn) {
    console.log(`Local access: ${url}`);
  }

  if (opts.open) {
    openBrowser(url);
  }

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\nShutting down…");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise<void>(() => {
    // Keep the process alive until SIGINT.
  });
}
