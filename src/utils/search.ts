import { join } from "path";
import { readdirSync, readFileSync, existsSync } from "fs";
import { extractTextContent } from "./sessions";
import { listProjects, projectDirPath } from "./projects";

export interface SearchSnippet {
  text: string;
  matchIndex: number;
}

export interface SearchHit {
  projectId: string;
  sessionId: string;
  slug: string | null;
  lastTimestamp: string | null;
  snippets: SearchSnippet[];
}

export interface SearchResult {
  query: string;
  scope: "project" | "all";
  projectId: string | null;
  hits: SearchHit[];
  truncated: boolean;
  empty: boolean;
}

const RESULT_CAP = 50;
const SNIPPET_RADIUS = 40;
const SNIPPET_MAX_TOTAL = 80;
const MAX_SNIPPETS_PER_SESSION = 3;

export interface SearchOptions {
  query: string;
  scope: "project" | "all";
  projectId?: string | null;
}

export function search(opts: SearchOptions): SearchResult {
  const query = (opts.query ?? "").trim();
  if (query.length === 0) {
    return {
      query,
      scope: opts.scope,
      projectId: opts.projectId ?? null,
      hits: [],
      truncated: false,
      empty: true,
    };
  }

  const lower = query.toLowerCase();
  const projects = listProjects();
  const targetProjects =
    opts.scope === "all"
      ? projects
      : projects.filter((p) => p.id === opts.projectId);

  const hits: SearchHit[] = [];
  let truncated = false;

  outer: for (const project of targetProjects) {
    const dir = projectDirPath(project.id);
    if (!existsSync(dir)) continue;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    const jsonlFiles = entries.filter(
      (f) => f.endsWith(".jsonl") && !f.endsWith(".wakatime")
    );

    for (const file of jsonlFiles) {
      const sessionId = file.replace(/\.jsonl$/, "");
      const sessionHit = scanSession(
        join(dir, file),
        project.id,
        sessionId,
        lower
      );
      if (sessionHit) {
        hits.push(sessionHit);
      }
    }

    if (hits.length > RESULT_CAP * 2) {
      // Don't bail early — we still need to sort, but collecting a huge number
      // is wasteful. Cap the collection to 4x the display cap to bound work.
      truncated = true;
      break outer;
    }
  }

  hits.sort((a, b) => {
    const ta = a.lastTimestamp ?? "";
    const tb = b.lastTimestamp ?? "";
    return tb.localeCompare(ta);
  });

  let clipped = hits;
  if (hits.length > RESULT_CAP) {
    clipped = hits.slice(0, RESULT_CAP);
    truncated = true;
  }

  return {
    query,
    scope: opts.scope,
    projectId: opts.projectId ?? null,
    hits: clipped,
    truncated,
    empty: false,
  };
}

function scanSession(
  filePath: string,
  projectId: string,
  sessionId: string,
  lowerQuery: string
): SearchHit | null {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const lines = text.split("\n");
  const snippets: SearchSnippet[] = [];
  let slug: string | null = null;
  let lastTimestamp: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: any;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (!slug && typeof entry.slug === "string") slug = entry.slug;
    if (typeof entry.timestamp === "string") lastTimestamp = entry.timestamp;

    if (
      (entry.type === "user" || entry.type === "assistant") &&
      !entry.isMeta &&
      entry.message?.content
    ) {
      const content = extractTextContent(entry.message.content);
      if (!content) continue;
      const lowerContent = content.toLowerCase();
      let idx = lowerContent.indexOf(lowerQuery);
      while (idx !== -1 && snippets.length < MAX_SNIPPETS_PER_SESSION) {
        snippets.push(makeSnippet(content, idx, lowerQuery.length));
        idx = lowerContent.indexOf(lowerQuery, idx + lowerQuery.length);
      }
      if (snippets.length >= MAX_SNIPPETS_PER_SESSION) break;
    }
  }

  if (snippets.length === 0) return null;
  return { projectId, sessionId, slug, lastTimestamp, snippets };
}

function makeSnippet(
  content: string,
  matchIndex: number,
  matchLen: number
): SearchSnippet {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(content.length, matchIndex + matchLen + SNIPPET_RADIUS);
  let slice = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (slice.length > SNIPPET_MAX_TOTAL) {
    slice = slice.slice(0, SNIPPET_MAX_TOTAL);
  }
  return { text: slice, matchIndex };
}
