import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export function getClaudeDir(): string {
  return join(homedir(), ".claude");
}

export function cwdToProjectDirName(cwd: string): string {
  return cwd
    .replace(/\\/g, "/")
    .replace(/\/$/, "")
    .replace(":/", "--")
    .replace(/\//g, "-")
    .replace(/\./g, "-");
}

export function getProjectDir(cwd?: string): string {
  const dir = cwd ?? process.cwd();
  const claudeDir = getClaudeDir();
  const projectName = cwdToProjectDirName(dir);
  const projectDir = join(claudeDir, "projects", projectName);

  if (!existsSync(projectDir)) {
    throw new Error(
      `No Claude Code sessions found for this project.\nExpected: ${projectDir}`
    );
  }

  return projectDir;
}
