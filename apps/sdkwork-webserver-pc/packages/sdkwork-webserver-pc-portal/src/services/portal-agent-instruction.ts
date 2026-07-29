import type { PortalTranslator } from "./portal-translator.ts";

export function createPortalAgentInstruction(t: PortalTranslator): string {
  return t("skill.commandTemplate");
}
