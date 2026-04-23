import { Marked } from "marked";
import { html, raw, escape, render, type RawHtml } from "./html";
import type { ProjectInfo } from "../../utils/projects";
import type { SessionDetail } from "../../utils/sessions";

const marked = new Marked({
  async: false,
  gfm: true,
  breaks: false,
  pedantic: false,
});

// Neutralize raw HTML in message content: marked emits an `html` token for
// any `<...>` sequence in the source. By default those pass through verbatim,
// which would let `<script>` or `<img onerror>` execute. Override both the
// block and inline html renderers to escape the raw text instead.
marked.use({
  renderer: {
    html(token: any) {
      return escape(token.text);
    },
  },
  tokenizer: {},
});

function renderMarkdownSafe(text: string): string {
  const htmlOut = marked.parse(text, { async: false }) as string;
  return htmlOut;
}

function formatDate(ts: string | null): string {
  if (!ts) return "unknown";
  try {
    return new Date(ts).toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return ts;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayName(p: ProjectInfo): string {
  return p.cwd && p.cwd.length > 0 ? p.cwd : p.id;
}

export interface SessionDetailOptions {
  project: ProjectInfo;
  detail: SessionDetail;
}

export function renderSessionDetail(opts: SessionDetailOptions): string {
  const { project, detail } = opts;

  const messages = detail.messages.map((m, idx) => {
    const role = m.role;
    const body = raw(renderMarkdownSafe(m.text));
    return html`
      <article class="message role-${role}" id="m-${idx + 1}">
        <header>
          <span class="role">${role === "user" ? "USER" : "ASSISTANT"}</span>
          <span class="muted">${formatDate(m.timestamp)}</span>
          <span class="muted">#${idx + 1}</span>
        </header>
        <div class="body">${body}</div>
      </article>`;
  });

  return render(html`
    <nav class="muted"><a href="/p/${project.id}">← ${displayName(project)}</a></nav>
    <h1>Session ${detail.sessionId.slice(0, 8)}</h1>
    <dl class="meta-grid">
      <dt>Session</dt><dd>${detail.sessionId}</dd>
      <dt>Slug</dt><dd>${detail.slug ?? raw('<span class="muted">(none)</span>')}</dd>
      <dt>Branch</dt><dd>${detail.gitBranch ?? raw('<span class="muted">(none)</span>')}</dd>
      <dt>Started</dt><dd>${formatDate(detail.timestamp)}</dd>
      <dt>Last</dt><dd>${formatDate(detail.lastTimestamp)}</dd>
      <dt>Messages</dt><dd>${detail.messageCount} total (${detail.userMessageCount} user, ${detail.assistantMessageCount} assistant)</dd>
      <dt>Size</dt><dd>${formatSize(detail.fileSizeBytes)}</dd>
    </dl>

    <div class="resume-box">
      <strong>Resume in terminal:</strong>
      <code id="resume-cmd">claude --resume ${detail.sessionId}</code>
      <button type="button" class="copy-btn" data-copy-target="#resume-cmd">Copy</button>
      <form class="inline"
            hx-post="/p/${project.id}/s/${detail.sessionId}/delete"
            hx-confirm="Delete this session? This cannot be undone."
            hx-swap="none">
        <button type="submit" class="danger">Delete session</button>
      </form>
    </div>

    <h2>Conversation (${detail.messages.length} messages)</h2>
    ${messages.length === 0
      ? html`<div class="empty">No readable messages in this session.</div>`
      : raw(messages.map((m) => m.value).join(""))}
  `);
}
