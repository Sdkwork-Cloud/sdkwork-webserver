import type { PortalAgentDefinition } from "../data/portal-agent-catalog.ts";
import type { PortalTranslator } from "./portal-translator.ts";

export function createPortalAgentInstruction(
  agent: PortalAgentDefinition,
  t: PortalTranslator,
): string {
  return t("skill.commandTemplate", {
    agent: agent.label,
    agentGuide: t(agent.guideKey),
  });
}
