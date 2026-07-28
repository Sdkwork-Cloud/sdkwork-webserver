import { Bot, Check, Clipboard, ShieldCheck, Terminal, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { portalAgentCatalog } from "../data/portal-agent-catalog.ts";
import { useSkillInstruction } from "../hooks/use-skill-instruction.ts";
import { createPortalAgentInstruction } from "../services/portal-agent-instruction.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalAgent, PortalClipboardPort } from "../types.ts";

export function SkillIntegrationSection({
  clipboard,
  t,
}: {
  clipboard: PortalClipboardPort;
  t: PortalTranslator;
}) {
  const [agent, setAgent] = useState<PortalAgent>("codex");
  const activeAgent = portalAgentCatalog.find((candidate) => candidate.id === agent) ?? portalAgentCatalog[0];
  const instruction = useMemo(
    () => createPortalAgentInstruction(activeAgent, t),
    [activeAgent, t],
  );
  const { copyInstruction, copyState } = useSkillInstruction(clipboard, instruction);
  const copyLabel = copyState === "copied"
    ? t("skill.copied")
    : copyState === "copying"
      ? t("skill.copying")
      : t("skill.copy");

  return (
    <section className="scroll-mt-[52px] border-b border-emerald-300/15 bg-[#122a22] py-14 text-white sm:py-16" id="skill">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-7 lg:px-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-[790px]">
            <span className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-300">
              <Bot aria-hidden="true" size={17} />
              {t("skill.eyebrow")}
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{t("skill.title")}</h2>
            <p className="mt-4 max-w-[760px] leading-7 text-emerald-50/75">{t("skill.description")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 border-l border-emerald-300/25 pl-4 text-sm text-emerald-100">
            <strong className="text-3xl text-white">{portalAgentCatalog.length}</strong>
            <span className="max-w-28 leading-5">{t("skill.agentCount")}</span>
          </div>
        </div>

        <div className="mt-9 min-w-0">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/15 bg-white/10 sm:grid-cols-4 lg:grid-cols-7" role="tablist" aria-label={t("skill.tablist")}>
            {portalAgentCatalog.map((candidate) => (
              <button
                aria-selected={candidate.id === agent}
                className={`min-h-12 min-w-0 px-3 text-sm font-semibold transition-colors ${candidate.id === agent ? "bg-emerald-400 text-emerald-950" : "bg-[#173329] text-emerald-50/70 hover:bg-[#1d3d31] hover:text-white"}`}
                key={candidate.id}
                onClick={() => setAgent(candidate.id)}
                role="tab"
                type="button"
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-white/15 bg-[#08150f] shadow-2xl">
            <header className="flex min-h-10 items-center justify-between gap-4 bg-white/[0.04] px-4">
              <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xs font-semibold text-emerald-100/70">
                <Terminal aria-hidden="true" size={15} />
                <span className="truncate">{t("skill.commandLabel")}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-emerald-300">
                <ShieldCheck aria-hidden="true" size={14} />
                {t("skill.governed")}
              </span>
            </header>
            <div className="grid lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="block text-xs text-emerald-100/60">{t("skill.selectedAgent")}</span>
                <strong className="mt-2 block text-lg text-white">{activeAgent.label}</strong>
                <span className="mt-4 block text-xs leading-5 text-emerald-100/65">{t("skill.selectionHint")}</span>
              </div>
              <pre className="m-0 max-h-[280px] min-h-[210px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-zinc-300 sm:text-[13px]">{instruction}</pre>
            </div>
            <footer className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className={`flex items-center gap-2 text-xs ${copyState === "error" ? "text-amber-200" : "text-emerald-200"}`} role={copyState === "error" ? "alert" : "status"}>
                {copyState === "error" ? <TriangleAlert aria-hidden="true" size={15} /> : copyState === "copied" ? <Check aria-hidden="true" size={15} /> : null}
                {copyState === "error" ? t("skill.copyError") : copyState === "copied" ? t("skill.copied") : t("skill.ready")}
              </span>
              <button
                className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70"
                disabled={copyState === "copying"}
                onClick={() => void copyInstruction()}
                type="button"
              >
                {copyState === "copied" ? <Check aria-hidden="true" size={17} /> : <Clipboard aria-hidden="true" size={17} />}
                {copyLabel}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
}
