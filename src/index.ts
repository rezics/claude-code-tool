import { defineCommand } from "citty";

const main = defineCommand({
  meta: {
    name: "claude-code-tool",
    version: "0.1.0",
    description: "Manage Claude Code sessions for the current project",
  },
  subCommands: {
    list: () => import("./commands/list").then((m) => m.default),
    show: () => import("./commands/show").then((m) => m.default),
    delete: () => import("./commands/delete").then((m) => m.default),
    resume: () => import("./commands/resume").then((m) => m.default),
  },
  run: async ({ rawArgs }) => {
    // Only run default list when no subcommand is given
    const subCommandNames = ["list", "show", "delete", "resume"];
    const hasSubCommand = rawArgs.some((arg: string) => subCommandNames.includes(arg));
    if (!hasSubCommand) {
      const { default: listCmd } = await import("./commands/list");
      await listCmd.run!({ args: {} } as any);
    }
  },
});

export default main;
