import { join } from "path";
import { readdirSync, rmSync, existsSync } from "fs";

export interface SessionSummary {
  sessionId: string;
  slug: string | null;
  timestamp: string | null;
  lastTimestamp: string | null;
  messageCount: number;
  firstUserMessage: string;
  gitBranch: string | null;
}

export function listSessions(projectDir: string): string[] {
  return readdirSync(projectDir)
    .filter((f) => f.endsWith(".jsonl") && !f.endsWith(".wakatime"))
    .map((f) => f.replace(".jsonl", ""));
}

function cleanMessageContent(text: string): string {
  // Extract command name and args if present
  const nameMatch = text.match(/<command-name>\/?([^<]+)<\/command-name>/);
  const argsMatch = text.match(/<command-args>([^<]*)<\/command-args>/);

  if (nameMatch) {
    const name = nameMatch[1].trim();
    const args = argsMatch ? argsMatch[1].trim() : "";
    return args ? `${name} ${args}` : name;
  }

  // Otherwise strip all XML tags and clean up
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return cleanMessageContent(content);
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string") {
        return cleanMessageContent(block.text);
      }
    }
  }
  return "";
}

export async function getSessionSummary(
  projectDir: string,
  sessionId: string
): Promise<SessionSummary> {
  const filePath = join(projectDir, `${sessionId}.jsonl`);
  const text = await Bun.file(filePath).text();
  const lines = text.split("\n").filter((l) => l.trim());

  const summary: SessionSummary = {
    sessionId,
    slug: null,
    timestamp: null,
    lastTimestamp: null,
    messageCount: 0,
    firstUserMessage: "",
    gitBranch: null,
  };

  let foundFirstUserMessage = false;

  for (const line of lines) {
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === "user" || entry.type === "assistant") {
      summary.messageCount++;
    }

    if (entry.timestamp) {
      summary.lastTimestamp = entry.timestamp;
    }

    if (!summary.slug && entry.slug) {
      summary.slug = entry.slug;
    }

    if (!summary.gitBranch && entry.gitBranch) {
      summary.gitBranch = entry.gitBranch;
    }

    if (
      !foundFirstUserMessage &&
      entry.type === "user" &&
      entry.message?.role === "user" &&
      !entry.isMeta
    ) {
      summary.timestamp = entry.timestamp ?? null;
      const text = extractTextContent(entry.message.content);
      summary.firstUserMessage = text.slice(0, 120);
      foundFirstUserMessage = true;
    }
  }

  // If no non-meta user message found, fall back to first user message
  if (!foundFirstUserMessage) {
    for (const line of lines) {
      let entry: any;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.type === "user" && entry.message?.role === "user") {
        summary.timestamp = entry.timestamp ?? null;
        const text = extractTextContent(entry.message.content);
        summary.firstUserMessage = text.slice(0, 120);
        break;
      }
    }
  }

  return summary;
}

export function resolveSessionId(
  projectDir: string,
  prefix: string
): string {
  const sessions = listSessions(projectDir);
  const matches = sessions.filter((id) => id.startsWith(prefix));

  if (matches.length === 0) {
    throw new Error(`No session found matching prefix: ${prefix}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous prefix "${prefix}" matches ${matches.length} sessions:\n${matches.join("\n")}`
    );
  }

  return matches[0];
}

export function deleteSession(projectDir: string, sessionId: string): void {
  const jsonlPath = join(projectDir, `${sessionId}.jsonl`);
  const wakatimePath = join(projectDir, `${sessionId}.jsonl.wakatime`);
  const dirPath = join(projectDir, sessionId);

  if (existsSync(jsonlPath)) rmSync(jsonlPath);
  if (existsSync(wakatimePath)) rmSync(wakatimePath);
  if (existsSync(dirPath)) rmSync(dirPath, { recursive: true });
}
