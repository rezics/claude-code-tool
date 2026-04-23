import {
  listProjects,
  getProject,
  originProjectId,
  invalidateProjectCache,
  projectDirPath,
} from "../utils/projects";
import {
  listSessions,
  getSessionSummary,
  getSessionDetail,
  deleteSession,
} from "../utils/sessions";
import { search } from "../utils/search";
import { renderLayout } from "./views/layout";
import { renderProjectsIndex } from "./views/projects";
import {
  renderSessionListPage,
  renderRowsPartial,
  PAGE_SIZE,
} from "./views/sessionList";
import { renderSessionDetail } from "./views/sessionDetail";
import { renderSearchPage } from "./views/searchResults";
import { HTMX_JS, APP_CSS, APP_JS } from "./assets";

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export interface RouterContext {
  hostWarn: boolean;
}

function htmlResponse(body: string, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...SECURITY_HEADERS,
      ...extra,
    },
  });
}

function textResponse(body: string, status = 200, contentType = "text/plain; charset=utf-8"): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      ...SECURITY_HEADERS,
    },
  });
}

function assetResponse(body: string, contentType: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound(message = "Not found"): Response {
  const body = renderLayout({
    title: "Not found",
    projects: safeListProjects(),
    body: `<h1>Not found</h1><p>${escapeText(message)}</p><p><a href="/projects">Back to all projects</a></p>`,
  });
  return htmlResponse(body, 404);
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeListProjects() {
  try {
    return listProjects();
  } catch {
    return [];
  }
}

async function parseSummaries(projectId: string) {
  const dir = projectDirPath(projectId);
  const ids = listSessions(dir);
  const summaries = await Promise.all(
    ids.map((id) => getSessionSummary(dir, id))
  );
  summaries.sort((a, b) => {
    const ta = a.lastTimestamp ?? a.timestamp ?? "";
    const tb = b.lastTimestamp ?? b.timestamp ?? "";
    return tb.localeCompare(ta);
  });
  return summaries;
}

function getClientAddress(req: Request, server: Bun.Server<unknown>): string | null {
  try {
    const addr = server.requestIP(req);
    return addr ? `${addr.address}:${addr.port}` : null;
  } catch {
    return null;
  }
}

function parseCursor(url: URL): number {
  const raw = url.searchParams.get("cursor");
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function handleRequest(
  req: Request,
  server: Bun.Server<unknown>,
  ctx: RouterContext
): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  if (ctx.hostWarn) {
    const addr = getClientAddress(req, server);
    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname} from ${addr ?? "?"}`);
  }

  if (method === "POST" && req.headers.get("hx-request") !== "true") {
    return new Response("POST requests must originate from HTMX", {
      status: 400,
      headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain" },
    });
  }

  // Static assets
  if (method === "GET" && url.pathname === "/assets/htmx.min.js") {
    return assetResponse(HTMX_JS, "application/javascript; charset=utf-8");
  }
  if (method === "GET" && url.pathname === "/assets/app.css") {
    return assetResponse(APP_CSS, "text/css; charset=utf-8");
  }
  if (method === "GET" && url.pathname === "/assets/app.js") {
    return assetResponse(APP_JS, "application/javascript; charset=utf-8");
  }

  // POST /projects/refresh
  if (method === "POST" && url.pathname === "/projects/refresh") {
    invalidateProjectCache();
    const ref = req.headers.get("referer") ?? "/projects";
    return new Response(null, {
      status: 303,
      headers: {
        Location: ref,
        ...SECURITY_HEADERS,
      },
    });
  }

  // POST /p/:id/s/:sessionId/delete
  if (method === "POST") {
    const deleteMatch = url.pathname.match(
      /^\/p\/([^/]+)\/s\/([^/]+)\/delete\/?$/
    );
    if (deleteMatch) {
      const projectId = decodeURIComponent(deleteMatch[1]);
      const sessionId = decodeURIComponent(deleteMatch[2]);
      const project = getProject(projectId);
      if (!project) {
        return new Response("Project not found", {
          status: 404,
          headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain" },
        });
      }
      try {
        deleteSession(projectDirPath(projectId), sessionId);
        const referer = req.headers.get("referer") ?? "";
        const fromDetail = /\/s\/[^/]+\/?$/.test(
          (() => {
            try {
              return new URL(referer).pathname;
            } catch {
              return "";
            }
          })()
        );
        const extraHeaders: Record<string, string> = { ...SECURITY_HEADERS };
        if (fromDetail) {
          extraHeaders["HX-Redirect"] = `/p/${encodeURIComponent(projectId)}`;
        }
        return new Response(null, { status: 204, headers: extraHeaders });
      } catch (err) {
        return new Response(
          `Failed to delete session: ${(err as Error).message}`,
          {
            status: 500,
            headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain" },
          }
        );
      }
    }
    return new Response("Not found", { status: 404, headers: SECURITY_HEADERS });
  }

  // GET /
  if (method === "GET" && url.pathname === "/") {
    const id = originProjectId(process.cwd());
    if (id) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/p/${encodeURIComponent(id)}`,
          ...SECURITY_HEADERS,
        },
      });
    }
    const projects = safeListProjects();
    const body = renderProjectsIndex(projects);
    return htmlResponse(
      renderLayout({ title: "Projects", projects, body })
    );
  }

  // GET /projects
  if (method === "GET" && url.pathname === "/projects") {
    const projects = safeListProjects();
    const body = renderProjectsIndex(projects);
    return htmlResponse(
      renderLayout({ title: "Projects", projects, body })
    );
  }

  // GET /search
  if (method === "GET" && url.pathname === "/search") {
    const query = url.searchParams.get("q") ?? "";
    const scopeRaw = url.searchParams.get("scope") ?? "project";
    const scope = scopeRaw === "all" ? "all" : "project";
    const projectId = url.searchParams.get("project");
    const result = search({ query, scope, projectId });
    const projects = safeListProjects();
    const projectForScope = projectId ? getProject(projectId) : null;
    const body = renderSearchPage({ result, projects, projectForScope });
    return htmlResponse(
      renderLayout({
        title: query ? `Search: ${query}` : "Search",
        projects,
        activeProjectId: scope === "project" ? projectId : null,
        searchQuery: query,
        searchScope: scope,
        body,
      })
    );
  }

  // GET /p/:id/rows (HTMX pagination)
  const rowsMatch = url.pathname.match(/^\/p\/([^/]+)\/rows\/?$/);
  if (method === "GET" && rowsMatch) {
    const projectId = decodeURIComponent(rowsMatch[1]);
    const project = getProject(projectId);
    if (!project) return notFound(`No project with id ${projectId}`);
    const summaries = await parseSummaries(projectId);
    const cursor = parseCursor(url);
    const body = renderRowsPartial(project, summaries, cursor, summaries.length);
    return htmlResponse(body);
  }

  // GET /p/:id/s/:sessionId
  const detailMatch = url.pathname.match(/^\/p\/([^/]+)\/s\/([^/]+)\/?$/);
  if (method === "GET" && detailMatch) {
    const projectId = decodeURIComponent(detailMatch[1]);
    const sessionId = decodeURIComponent(detailMatch[2]);
    const project = getProject(projectId);
    if (!project) return notFound(`No project with id ${projectId}`);
    try {
      const detail = await getSessionDetail(projectDirPath(projectId), sessionId);
      const projects = safeListProjects();
      const body = renderSessionDetail({ project, detail });
      return htmlResponse(
        renderLayout({
          title: `Session ${sessionId.slice(0, 8)}`,
          projects,
          activeProjectId: projectId,
          body,
        })
      );
    } catch (err) {
      return notFound(
        `Session not found: ${sessionId} (${(err as Error).message})`
      );
    }
  }

  // GET /p/:id
  const projectMatch = url.pathname.match(/^\/p\/([^/]+)\/?$/);
  if (method === "GET" && projectMatch) {
    const projectId = decodeURIComponent(projectMatch[1]);
    const project = getProject(projectId);
    if (!project) return notFound(`No project with id ${projectId}`);
    const summaries = await parseSummaries(projectId);
    const cursor = parseCursor(url);
    const body = renderSessionListPage({
      project,
      summaries,
      total: summaries.length,
      cursor,
    });
    const projects = safeListProjects();
    return htmlResponse(
      renderLayout({
        title: project.cwd ?? project.id,
        projects,
        activeProjectId: projectId,
        body,
      })
    );
  }

  return notFound();
}
