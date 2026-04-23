import { html, raw, escape, render, type RawHtml } from "./html";
import type { SearchResult, SearchHit } from "../../utils/search";
import type { ProjectInfo } from "../../utils/projects";

function formatDate(ts: string | null): string {
  if (!ts) return "unknown";
  try {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return ts;
  }
}

function displayName(p: ProjectInfo): string {
  return p.cwd && p.cwd.length > 0 ? p.cwd : p.id;
}

function highlightSnippet(text: string, query: string): RawHtml {
  if (!query) return raw(escape(text));
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let out = "";
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      out += escape(text.slice(cursor));
      break;
    }
    out += escape(text.slice(cursor, idx));
    out += `<mark>${escape(text.slice(idx, idx + q.length))}</mark>`;
    cursor = idx + q.length;
  }
  return raw(out);
}

export interface SearchPageOptions {
  result: SearchResult;
  projects: ProjectInfo[];
  projectForScope: ProjectInfo | null;
}

export function renderSearchPage(opts: SearchPageOptions): string {
  const { result, projects, projectForScope } = opts;

  if (result.empty) {
    return render(html`
      <h1>Search</h1>
      <p class="muted">Enter a query in the search box above to search session contents.</p>
    `);
  }

  const scopeDescription =
    result.scope === "all"
      ? "across all projects"
      : projectForScope
      ? `in ${displayName(projectForScope)}`
      : "in the selected project";

  const scopeToggleHref =
    result.scope === "all"
      ? result.projectId
        ? `/search?q=${encodeURIComponent(result.query)}&scope=project&project=${encodeURIComponent(result.projectId)}`
        : null
      : `/search?q=${encodeURIComponent(result.query)}&scope=all`;

  const scopeToggleLabel =
    result.scope === "all" ? "Restrict to current project" : "Search all projects";

  const byId = new Map(projects.map((p) => [p.id, p]));

  const rows = result.hits.map((hit: SearchHit) => {
    const project = byId.get(hit.projectId);
    const projectLabel = project ? displayName(project) : hit.projectId;
    return html`
      <div class="search-result">
        <div>
          <a class="sessionId" href="/p/${hit.projectId}/s/${hit.sessionId}">${hit.sessionId.slice(0, 8)}</a>
          ${hit.slug ? raw(` · <span>${escape(hit.slug)}</span>`) : raw("")}
          <span class="muted"> · ${formatDate(hit.lastTimestamp)}</span>
          ${result.scope === "all" ? raw(` · <a href="/p/${escape(hit.projectId)}">${escape(projectLabel)}</a>`) : raw("")}
        </div>
        ${raw(
          hit.snippets
            .map((s) => `<div class="snippet">${highlightSnippet(s.text, result.query).value}</div>`)
            .join("")
        )}
      </div>`;
  });

  return render(html`
    <h1>Search: “${result.query}”</h1>
    <p class="muted">
      ${result.hits.length} result${result.hits.length === 1 ? "" : "s"} ${scopeDescription}${result.truncated ? " (truncated at 50)" : ""}.
      ${scopeToggleHref ? raw(` · <a href="${escape(scopeToggleHref)}">${escape(scopeToggleLabel)}</a>`) : raw("")}
    </p>
    ${result.hits.length === 0
      ? html`<div class="empty">No matches found.</div>`
      : raw(rows.map((r) => r.value).join(""))}
  `);
}
