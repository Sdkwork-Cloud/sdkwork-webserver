import type { PortalAgent } from "../types.ts";

export interface PortalAgentDefinition {
  id: PortalAgent;
  label: string;
}

export const portalAgentCatalog = [
  { id: "codex", label: "Codex" },
  { id: "claude-code", label: "Claude Code" },
  { id: "workbuddy", label: "WorkBuddy" },
  { id: "opencode", label: "OpenCode" },
  { id: "openclaw", label: "OpenClaw" },
  { id: "herms-agent", label: "Herms Agent" },
  { id: "qoder-work", label: "Qoder Work" },
] as const satisfies readonly PortalAgentDefinition[];

export const portalAgentCount = portalAgentCatalog.length;
