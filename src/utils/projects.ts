import { join } from "path";
import { existsSync, readdirSync, statSync } from "fs";
import { getClaudeDir, cwdToProjectDirName } from "./paths";

export interface ProjectInfo {
  id: string;
  sessionCount: number;
  lastTimestamp: string | null;
  cwd: string | null;
}

interface ProjectCacheEntry {
  info: ProjectInfo;
  cwdResolved: boolean;
}

const projectCache = new Map<string, ProjectCacheEntry>();
let listCache: ProjectInfo[] | null = null;

function projectsRoot(): string {
  return join(getClaudeDir(), "projects");
}

function readLastTimestamp(filePath: string): string | null {
  try {
    const text = require("fs").readFileSync(filePath, "utf8") as string;
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const entry = JSON.parse(line);
        if (typeof entry.timestamp === "string") return entry.timestamp;
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function scanProject(id: string): ProjectInfo | null {
  const dir = join(projectsRoot(), id);
  if (!existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const jsonlFiles = entries.filter(
    (f) => f.endsWith(".jsonl") && !f.endsWith(".wakatime")
  );
  if (jsonlFiles.length === 0) return null;

  let lastTimestamp: string | null = null;
  for (const file of jsonlFiles) {
    const ts = readLastTimestamp(join(dir, file));
    if (ts && (!lastTimestamp || ts > lastTimestamp)) {
      lastTimestamp = ts;
    }
  }

  return {
    id,
    sessionCount: jsonlFiles.length,
    lastTimestamp,
    cwd: null,
  };
}

export function listProjects(): ProjectInfo[] {
  if (listCache) return listCache;
  const root = projectsRoot();
  if (!existsSync(root)) {
    listCache = [];
    return listCache;
  }

  let dirEntries: string[];
  try {
    dirEntries = readdirSync(root);
  } catch {
    listCache = [];
    return listCache;
  }

  const projects: ProjectInfo[] = [];
  for (const name of dirEntries) {
    const full = join(root, name);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    const info = scanProject(name);
    if (!info) continue;
    const cached = projectCache.get(name);
    if (cached?.cwdResolved) {
      info.cwd = cached.info.cwd;
    } else {
      info.cwd = resolveProjectCwd(name);
      projectCache.set(name, { info, cwdResolved: true });
    }
    projects.push(info);
  }

  projects.sort((a, b) => {
    if (a.lastTimestamp && b.lastTimestamp) {
      return b.lastTimestamp.localeCompare(a.lastTimestamp);
    }
    if (a.lastTimestamp) return -1;
    if (b.lastTimestamp) return 1;
    return a.id.localeCompare(b.id);
  });

  listCache = projects;
  return projects;
}

export function getProject(id: string): ProjectInfo | null {
  const all = listProjects();
  return all.find((p) => p.id === id) ?? null;
}

export function resolveProjectCwd(id: string): string | null {
  const dir = join(projectsRoot(), id);
  if (!existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const jsonlFiles = entries.filter(
    (f) => f.endsWith(".jsonl") && !f.endsWith(".wakatime")
  );
  for (const file of jsonlFiles) {
    try {
      const text = require("fs").readFileSync(join(dir, file), "utf8") as string;
      const lines = text.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const entry = JSON.parse(trimmed);
          if (typeof entry.cwd === "string" && entry.cwd.length > 0) {
            return entry.cwd;
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function invalidateProjectCache(): void {
  projectCache.clear();
  listCache = null;
}

export function originProjectId(cwd: string): string | null {
  const id = cwdToProjectDirName(cwd);
  const full = join(projectsRoot(), id);
  if (!existsSync(full)) return null;
  const info = scanProject(id);
  return info ? id : null;
}

export function projectDirPath(id: string): string {
  return join(projectsRoot(), id);
}
