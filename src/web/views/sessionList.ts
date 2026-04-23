import { html, raw, escape, render, type RawHtml } from "./html";
import type { SessionSummary } from "../../utils/sessions";
import type { ProjectInfo } from "../../utils/projects";

export const PAGE_SIZE = 50;

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

function renderRow(project: ProjectInfo, s: SessionSummary): RawHtml {
  return html`
    <tr id="row-${s.sessionId}" data-session-id="${s.sessionId}">
      <td><a class="sessionId" href="/p/${project.id}/s/${s.sessionId}">${s.sessionId.slice(0, 8)}</a></td>
      <td>${s.slug ?? raw('<span class="muted">(no slug)</span>')}</td>
      <td>${s.gitBranch ?? raw('<span class="muted">-</span>')}</td>
      <td>${s.messageCount}</td>
      <td class="muted">${formatDate(s.timestamp)}</td>
      <td class="session-summary">${s.firstUserMessage || raw('<span class="muted">(empty session)</span>')}</td>
      <td>
        <form class="inline"
              hx-post="/p/${project.id}/s/${s.sessionId}/delete"
              hx-confirm="Delete session ${s.sessionId.slice(0, 8)}? This cannot be undone."
              hx-target="#row-${s.sessionId}"
              hx-swap="delete">
          <button type="submit" class="danger" title="Delete session">×</button>
        </form>
      </td>
    </tr>`;
}

function renderLoadMore(
  project: ProjectInfo,
  nextCursor: number,
  remaining: number
): RawHtml {
  return html`
    <tr id="load-more">
      <td colspan="7" class="load-more">
        <button
          type="button"
          hx-get="/p/${project.id}/rows?cursor=${nextCursor}"
          hx-target="#load-more"
          hx-swap="outerHTML">Load more (${remaining} remaining)</button>
      </td>
    </tr>`;
}

function renderRowsWithLoadMore(
  project: ProjectInfo,
  summaries: SessionSummary[],
  cursor: number,
  total: number
): RawHtml {
  const page = summaries.slice(cursor, cursor + PAGE_SIZE);
  const nextCursor = cursor + page.length;
  const hasMore = nextCursor < total;
  const rowHtml = raw(page.map((s) => renderRow(project, s).value).join(""));
  return hasMore
    ? html`${rowHtml}${renderLoadMore(project, nextCursor, total - nextCursor)}`
    : rowHtml;
}

export interface SessionListPageOptions {
  project: ProjectInfo;
  summaries: SessionSummary[];
  total: number;
  cursor: number;
}

export function renderSessionListPage(opts: SessionListPageOptions): string {
  const { project, summaries, total, cursor } = opts;

  if (total === 0) {
    return render(html`
      <h1>${displayName(project)}</h1>
      <p class="muted"><code>${project.id}</code></p>
      <div class="empty">No sessions yet in this project.</div>
    `);
  }

  return render(html`
    <h1>${displayName(project)}</h1>
    <p class="muted"><code>${project.id}</code> — ${total} session${total === 1 ? "" : "s"}</p>
    <table class="rows">
      <thead>
        <tr>
          <th>ID</th>
          <th>Slug</th>
          <th>Branch</th>
          <th>Msgs</th>
          <th>Date</th>
          <th>Summary</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${renderRowsWithLoadMore(project, summaries, cursor, total)}</tbody>
    </table>
  `);
}

export function renderRowsPartial(
  project: ProjectInfo,
  summaries: SessionSummary[],
  cursor: number,
  total: number
): string {
  return render(renderRowsWithLoadMore(project, summaries, cursor, total));
}
