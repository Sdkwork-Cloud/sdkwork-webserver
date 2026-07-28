import { ArrowRight, Boxes, Rocket } from "lucide-react";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalNavigation } from "../types.ts";

export function PortalClosing({ navigation, t }: { navigation: PortalNavigation; t: PortalTranslator }) {
  return (
    <>
      <section className="bg-[#eef7f1] py-20 text-zinc-950 dark:bg-[#13201a] dark:text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 px-5 sm:px-7 lg:flex-row lg:items-end lg:px-10">
          <div className="max-w-[760px]">
            <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{t("cta.eyebrow")}</span>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{t("cta.title")}</h2>
            <p className="mt-4 max-w-[680px] leading-7 text-zinc-600 dark:text-zinc-300">{t("cta.description")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-bold text-white no-underline transition-colors hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300" href={navigation.consoleHref}>
              <Rocket aria-hidden="true" size={18} />
              {t("cta.primary")}
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 no-underline transition-colors hover:bg-zinc-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10" href={navigation.deploymentsHref}>
              {t("cta.secondary")}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </div>
      </section>
      <footer className="border-t border-zinc-200 bg-white py-7 text-zinc-700 dark:border-white/10 dark:bg-[#0d1511] dark:text-zinc-300">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <span className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
            <Boxes aria-hidden="true" className="text-emerald-700 dark:text-emerald-300" size={16} />
            {t("footer.product")}
          </span>
          <span>{t("footer.note")}</span>
        </div>
      </footer>
    </>
  );
}

