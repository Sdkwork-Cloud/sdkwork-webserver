import { Check, Clipboard, Terminal, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useSkillInstruction } from "../hooks/use-skill-instruction.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalAgent, PortalClipboardPort } from "../types.ts";

const agents = [
  { id: "codex", label: "Codex" },
  { id: "claude-code", label: "Claude Code" },
  { id: "workbuddy", label: "WorkBuddy" },
  { id: "opencode", label: "OpenCode" },
] as const satisfies readonly { id: PortalAgent; label: string }[];

export function SkillIntegrationSection({
  clipboard,
  t,
}: {
  clipboard: PortalClipboardPort;
  t: PortalTranslator;
}) {
  const [agent, setAgent] = useState<PortalAgent>("codex");
  const activeAgent = agents.find((candidate) => candidate.id === agent) ?? agents[0];
  const instruction = useMemo(
    () => t("skill.commandTemplate", { agent: activeAgent.label }),
    [activeAgent.label, t],
  );
  const { copyInstruction, copyState } = useSkillInstruction(clipboard, instruction);
  const copyLabel = copyState === "copied"
    ? t("skill.copied")
    : copyState === "copying"
      ? t("skill.copying")
      : t("skill.copy");

  return (
    <section className="scroll-mt-16 border-b border-emerald-300/15 bg-[#122a22] py-20 text-white" id="skill">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 sm:px-7 lg:grid-cols-[0.78fr_1.22fr] lg:px-10">
        <div>
          <div className="flex size-11 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
            <Terminal aria-hidden="true" size={23} />
          </div>
          <span className="mt-7 block text-xs font-bold uppercase text-emerald-300">{t("skill.eyebrow")}</span>
          <h2 className="mt-3 max-w-[520px] text-3xl font-bold leading-tight sm:text-4xl">{t("skill.title")}</h2>
          <p className="mt-5 max-w-[540px] leading-7 text-emerald-50/75">{t("skill.description")}</p>
        </div>
        <div className="min-w-0">
          <div className="flex overflow-x-auto border-b border-white/15" role="tablist" aria-label={t("skill.tablist")}>
            {agents.map((candidate) => (
              <button
                aria-selected={candidate.id === agent}
                className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors ${candidate.id === agent ? "border-emerald-300 text-white" : "border-transparent text-emerald-50/60 hover:text-white"}`}
                key={candidate.id}
                onClick={() => setAgent(candidate.id)}
                role="tab"
                type="button"
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-md border border-white/15 bg-[#08150f] shadow-2xl">
            <header className="flex min-h-12 items-center justify-between gap-4 border-b border-white/10 px-4">
              <span className="flex items-center gap-2 text-xs font-semibold text-emerald-100/70">
                <Terminal aria-hidden="true" size={15} />
                {t("skill.commandLabel")}
              </span>
              <span className="text-xs text-emerald-300">{activeAgent.label}</span>
            </header>
            <pre className="m-0 max-h-[260px] min-h-[220px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-zinc-300 sm:text-[13px]">{instruction}</pre>
            <footer className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className={`flex items-center gap-2 text-xs ${copyState === "error" ? "text-amber-200" : "text-emerald-200"}`} role={copyState === "error" ? "alert" : "status"}>
                {copyState === "error" ? <TriangleAlert aria-hidden="true" size={15} /> : copyState === "copied" ? <Check aria-hidden="true" size={15} /> : null}
                {copyState === "error" ? t("skill.copyError") : copyState === "copied" ? t("skill.copied") : null}
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

