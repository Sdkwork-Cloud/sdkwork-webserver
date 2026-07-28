import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalAgent } from "../types.ts";

export interface PortalAgentDefinition {
  guideKey: PortalMessageKey;
  id: PortalAgent;
  label: string;
}

export const portalAgentCatalog = [
  { id: "codex", label: "Codex", guideKey: "skill.agent.codexGuide" },
  { id: "claude-code", label: "Claude Code", guideKey: "skill.agent.claudeCodeGuide" },
  { id: "workbuddy", label: "WorkBuddy", guideKey: "skill.agent.workbuddyGuide" },
  { id: "opencode", label: "OpenCode", guideKey: "skill.agent.opencodeGuide" },
  { id: "openclaw", label: "OpenClaw", guideKey: "skill.agent.openclawGuide" },
  { id: "herms-agent", label: "Herms Agent", guideKey: "skill.agent.hermsAgentGuide" },
  { id: "qoder-work", label: "Qoder Work", guideKey: "skill.agent.qoderWorkGuide" },
] as const satisfies readonly PortalAgentDefinition[];

export const portalAgentCount = portalAgentCatalog.length;
