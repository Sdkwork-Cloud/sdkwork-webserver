import { Check, CircleCheck, History, ShieldCheck } from "lucide-react";
import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";

const steps = [
  ["workflow.step1.title", "workflow.step1.description"],
  ["workflow.step2.title", "workflow.step2.description"],
  ["workflow.step3.title", "workflow.step3.description"],
  ["workflow.step4.title", "workflow.step4.description"],
] as const satisfies readonly (readonly [PortalMessageKey, PortalMessageKey])[];

const deploymentFacts = [
  ["workflow.panel.artifact", "workflow.panel.artifactValue"],
  ["workflow.panel.integrity", "workflow.panel.integrityValue"],
  ["workflow.panel.ingress", "workflow.panel.ingressValue"],
  ["workflow.panel.rollback", "workflow.panel.rollbackValue"],
] as const satisfies readonly (readonly [PortalMessageKey, PortalMessageKey])[];

export function DeploymentWorkflow({ t }: { t: PortalTranslator }) {
  return (
    <section className="scroll-mt-[52px] border-b border-zinc-200 bg-[#f4f7f5] py-20 text-zinc-950 dark:border-white/10 dark:bg-[#111a16] dark:text-white" id="workflow">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.88fr)] lg:px-10">
        <div>
          <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{t("workflow.eyebrow")}</span>
          <h2 className="mt-3 max-w-[700px] text-3xl font-bold leading-tight sm:text-4xl">{t("workflow.title")}</h2>
          <p className="mt-4 max-w-[680px] leading-7 text-zinc-600 dark:text-zinc-300">{t("workflow.description")}</p>
          <ol className="mt-10 border-l border-zinc-300 dark:border-white/15">
            {steps.map(([title, description], index) => (
              <li className="relative pb-8 pl-8 last:pb-0" key={title}>
                <span className="absolute -left-[15px] top-0 grid size-7 place-items-center rounded-full border border-emerald-700 bg-white text-xs font-bold text-emerald-800 dark:border-emerald-300 dark:bg-[#111a16] dark:text-emerald-200">
                  {index + 1}
                </span>
                <h3 className="text-base font-bold">{t(title)}</h3>
                <p className="mt-2 max-w-[580px] text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t(description)}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="self-center overflow-hidden rounded-md border border-zinc-300 bg-white shadow-xl shadow-zinc-900/10 dark:border-white/15 dark:bg-[#0b120f]" aria-label={t("workflow.panel.title")}>
          <header className="flex min-h-11 items-center justify-between gap-3 bg-zinc-50 px-5 dark:bg-white/5">
            <div className="flex min-w-0 items-center gap-3 whitespace-nowrap">
              <span className="size-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              <strong className="truncate font-mono text-sm">{t("workflow.panel.title")}</strong>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
              {t("workflow.panel.status")}
            </span>
          </header>
          <dl className="m-0">
            {deploymentFacts.map(([label, value], index) => (
              <div className="grid min-h-16 grid-cols-[120px_minmax(0,1fr)] items-center border-b border-zinc-100 px-5 text-sm last:border-b-0 dark:border-white/10" key={label}>
                <dt className="text-zinc-500 dark:text-zinc-400">{t(label)}</dt>
                <dd className="m-0 flex min-w-0 items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                  {index === 1 ? <ShieldCheck aria-hidden="true" className="shrink-0 text-emerald-600" size={16} /> : index === 3 ? <History aria-hidden="true" className="shrink-0 text-sky-600" size={16} /> : <Check aria-hidden="true" className="shrink-0 text-emerald-600" size={16} />}
                  <span className="min-w-0 break-words">{t(value)}</span>
                </dd>
              </div>
            ))}
          </dl>
          <footer className="flex min-h-14 items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-5 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            <CircleCheck aria-hidden="true" className="text-emerald-600" size={17} />
            {t("workflow.panel.audit")}
          </footer>
        </div>
      </div>
    </section>
  );
}
