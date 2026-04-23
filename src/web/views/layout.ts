import { html, raw, escape, render, type RawHtml } from "./html";
import type { ProjectInfo } from "../../utils/projects";

export interface LayoutOptions {
  title: string;
  body: RawHtml | string;
  projects: ProjectInfo[];
  activeProjectId?: string | null;
  searchQuery?: string;
  searchScope?: "project" | "all";
}

function displayName(p: ProjectInfo): string {
  return p.cwd && p.cwd.length > 0 ? p.cwd : p.id;
}

function projectOptions(
  projects: ProjectInfo[],
  activeId: string | null | undefined
): RawHtml {
  const opts = projects.map((p) => {
    const sel = p.id === activeId ? " selected" : "";
    return `<option value="${escape(p.id)}"${sel}>${escape(displayName(p))}</option>`;
  });
  return raw(opts.join(""));
}

export function renderLayout(opts: LayoutOptions): string {
  const activeId = opts.activeProjectId ?? null;
  const searchScope = opts.searchScope ?? (activeId ? "project" : "all");
  const searchAction = "/search";
  const projectFieldValue = activeId ?? "";
  const bodyHtml = typeof opts.body === "string" ? raw(opts.body) : opts.body;

  const doc = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title} — claude-code-tool</title>
<link rel="stylesheet" href="/assets/app.css">
<script src="/assets/htmx.min.js" defer></script>
<script src="/assets/app.js" defer></script>
</head>
<body>
<nav class="topbar">
  <span class="brand"><a href="/projects">claude-code-tool</a></span>
  <form class="project-switcher inline" data-switch-project="true" method="get" action="/projects">
    <label for="project-select" class="muted">Project:</label>
    <select id="project-select" name="id">
      <option value="">— all projects —</option>
      ${projectOptions(opts.projects, activeId)}
    </select>
    <button type="submit">Go</button>
  </form>
  <form class="inline" method="get" action="${searchAction}" role="search">
    <input type="search" name="q" placeholder="Search…" value="${opts.searchQuery ?? ""}">
    <input type="hidden" name="scope" value="${searchScope}">
    ${activeId ? raw(`<input type="hidden" name="project" value="${escape(activeId)}">`) : raw("")}
    <button type="submit">Search</button>
  </form>
  <form class="inline" method="post" action="/projects/refresh"
        hx-post="/projects/refresh" hx-swap="none"
        title="Re-scan ~/.claude/projects/">
    <button type="submit" title="Refresh projects">↻</button>
  </form>
</nav>
<main>
${bodyHtml}
</main>
</body>
</html>`;
  return render(doc);
}
