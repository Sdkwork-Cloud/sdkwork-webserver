import { CloudCog, GlobeLock, PackageCheck } from "lucide-react";
import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";

const capabilities = [
  { icon: PackageCheck, title: "capabilities.publish.title", description: "capabilities.publish.description" },
  { icon: CloudCog, title: "capabilities.deploy.title", description: "capabilities.deploy.description" },
  { icon: GlobeLock, title: "capabilities.delivery.title", description: "capabilities.delivery.description" },
] as const satisfies readonly {
  icon: typeof PackageCheck;
  title: PortalMessageKey;
  description: PortalMessageKey;
}[];

export function CapabilityBand({ t }: { t: PortalTranslator }) {
  return (
    <section className="scroll-mt-16 border-b border-zinc-200 bg-white py-14 text-zinc-950 sm:py-20 dark:border-white/10 dark:bg-[#0d1511] dark:text-white [@media(max-height:760px)]:py-12" id="capabilities">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-7 lg:px-10">
        <div className="max-w-[760px]">
          <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{t("capabilities.eyebrow")}</span>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{t("capabilities.title")}</h2>
          <p className="mt-4 max-w-[700px] leading-7 text-zinc-600 dark:text-zinc-300">{t("capabilities.description")}</p>
        </div>
        <div className="mt-12 grid border-y border-zinc-200 md:grid-cols-3 dark:border-white/10">
          {capabilities.map(({ description, icon: Icon, title }, index) => (
            <article className={`py-8 md:px-8 ${index === 0 ? "md:pl-0" : "border-t border-zinc-200 md:border-l md:border-t-0 dark:border-white/10"}`} key={title}>
              <Icon className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" size={25} />
              <h3 className="mt-6 text-lg font-bold">{t(title)}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{t(description)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
