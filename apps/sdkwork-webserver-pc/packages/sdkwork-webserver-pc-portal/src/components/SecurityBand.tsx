import { FileCheck2, History, LockKeyhole, ShieldCheck } from "lucide-react";
import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";

const controls = [
  { icon: FileCheck2, title: "security.integrity.title", description: "security.integrity.description" },
  { icon: LockKeyhole, title: "security.tls.title", description: "security.tls.description" },
  { icon: ShieldCheck, title: "security.supply.title", description: "security.supply.description" },
  { icon: History, title: "security.audit.title", description: "security.audit.description" },
] as const satisfies readonly {
  icon: typeof FileCheck2;
  title: PortalMessageKey;
  description: PortalMessageKey;
}[];

export function SecurityBand({ t }: { t: PortalTranslator }) {
  return (
    <section className="scroll-mt-16 border-b border-zinc-200 bg-white py-20 text-zinc-950 dark:border-white/10 dark:bg-[#0d1511] dark:text-white" id="security">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-7 lg:px-10">
        <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{t("security.eyebrow")}</span>
        <h2 className="mt-3 max-w-[760px] text-3xl font-bold leading-tight sm:text-4xl">{t("security.title")}</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-white/10">
          {controls.map(({ description, icon: Icon, title }) => (
            <article className="min-h-56 bg-white p-6 dark:bg-[#121b17]" key={title}>
              <Icon aria-hidden="true" className="text-emerald-700 dark:text-emerald-300" size={24} />
              <h3 className="mt-8 text-base font-bold">{t(title)}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t(description)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

