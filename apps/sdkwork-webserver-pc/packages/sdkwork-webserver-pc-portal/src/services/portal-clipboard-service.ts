import type { PortalClipboardPort } from "../types.ts";

export interface PortalClipboardService {
  copyInstruction(instruction: string): Promise<void>;
}

export function createPortalClipboardService(
  clipboard: PortalClipboardPort,
): PortalClipboardService {
  return {
    async copyInstruction(instruction) {
      const value = instruction.trim();
      if (!value) throw new Error("The portal integration instruction is empty.");
      await clipboard.writeText(value);
    },
  };
}

