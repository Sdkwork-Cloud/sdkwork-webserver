import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortalClipboardService } from "../services/portal-clipboard-service.ts";
import type { PortalClipboardPort } from "../types.ts";

export type SkillInstructionCopyState = "copied" | "copying" | "error" | "idle";

export function useSkillInstruction(
  clipboard: PortalClipboardPort,
  instruction: string,
) {
  const service = useMemo(() => createPortalClipboardService(clipboard), [clipboard]);
  const [copyState, setCopyState] = useState<SkillInstructionCopyState>("idle");

  useEffect(() => setCopyState("idle"), [instruction]);

  const copyInstruction = useCallback(async () => {
    setCopyState("copying");
    try {
      await service.copyInstruction(instruction);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }, [instruction, service]);

  return { copyInstruction, copyState } as const;
}

