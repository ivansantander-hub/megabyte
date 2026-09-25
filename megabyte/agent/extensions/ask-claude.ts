/**
 * megabyte extension: ask_claude
 * Escalate to the Claude CLI when the local model is stuck; return its advice.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile } from "node:child_process";

const PARAMS = Type.Object({
  problem: Type.String({ description: "What you are trying to do and what fails" }),
  context: Type.Optional(Type.String({ description: "Useful data: errors, URLs, current state" })),
});

export default function askClaude(pi: ExtensionAPI) {
  pi.on("session_start", () => {
    pi.registerTool({
      name: "ask_claude",
      label: "Ask Claude",
      description:
        "When you are stuck (a tool fails, you cannot find how to proceed), describe " +
        "the problem and Claude returns a concrete solution.",
      parameters: PARAMS,
      async execute(_id: string, params: { problem: string; context?: string }) {
        const prompt =
          "You are the expert helper of a local agent (megabyte) that got stuck. " +
          "Give a concrete, short, actionable solution. No long code.\n\n" +
          `PROBLEM: ${params.problem}\n\n${params.context ?? ""}`;
        const cmd = process.env.MEGABYTE_CLAUDE || "claude";
        const text = await new Promise<string>((resolve) => {
          execFile(
            cmd,
            ["-p", prompt],
            {
              timeout: 180000,
              maxBuffer: 4 * 1024 * 1024,
              env: { ...process.env, CLAUDE_CONFIG_DIR: `${process.env.HOME}/.claude-personal` },
            },
            (err, stdout, stderr) => {
              if (err && !stdout) return resolve(`ERROR asking Claude: ${err.message}`);
              resolve((stdout || stderr || "").trim() || "(Claude returned nothing)");
            },
          );
        });
        return { content: [{ type: "text", text: "Claude's advice:\n" + text.slice(0, 1500) }] };
      },
    });
  });
}
