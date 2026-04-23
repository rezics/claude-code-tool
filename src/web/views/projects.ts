import { html, raw, escape, render } from "./html";
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

export function renderProjectsIndex(projects: ProjectInfo[]): string {
  if (projects.length === 0) {
    return render(html`
      <h1>Projects</h1>
      <div class="empty">
        No Claude Code projects found under <code>~/.claude/projects/</code>.<br>
        Start a <code>claude</code> session in some directory and it will appear here.
      </div>
    `);
  }

  const rows = projects.map((p) => {
    const cwdUnknown = !p.cwd;
    return html`
      <tr>
        <td><a href="/p/${p.id}">${displayName(p)}</a>${cwdUnknown ? raw(' <span class="muted">(cwd unknown)</span>') : raw("")}</td>
        <td>${p.sessionCount}</td>
        <td class="muted">${formatDate(p.lastTimestamp)}</td>
      </tr>`;
  });

  return render(html`
    <h1>Projects</h1>
    <p class="muted">${projects.length} project${projects.length === 1 ? "" : "s"} discovered. Ordered by most recent activity.</p>
    <table class="rows">
      <thead>
        <tr>
          <th>Project</th>
          <th>Sessions</th>
          <th>Last Activity</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}
