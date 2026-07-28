import { ArrowRight, CheckCircle2, CloudCog, Rocket } from "lucide-react";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalNavigation } from "../types.ts";
import { CloudTopologyScene } from "./CloudTopologyScene.tsx";

export function PortalHero({ navigation, t }: { navigation: PortalNavigation; t: PortalTranslator }) {
  const metrics = [
    ["hero.metric.application", "hero.metric.applicationLabel"],
    ["hero.metric.profile", "hero.metric.profileLabel"],
    ["hero.metric.security", "hero.metric.securityLabel"],
  ] as const;

  return (
    <section className="relative isolate overflow-hidden bg-[#10231b] text-white">
      <CloudTopologyScene t={t} />
      <div className="absolute inset-y-0 left-0 w-full bg-[#10231b] lg:w-[57%]" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[max(520px,calc(100svh-220px))] max-w-[1280px] items-center px-5 py-12 sm:px-7 sm:py-20 lg:px-10 [@media(max-height:760px)]:py-8">
        <div className="max-w-[680px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-950/70 px-3 py-2 text-xs font-semibold text-emerald-100 [@media(max-height:760px)]:mb-4">
            <CloudCog aria-hidden="true" size={16} />
            {t("hero.kicker")}
          </div>
          <h1 className="m-0 max-w-[640px] text-[46px] font-bold leading-[1.06] sm:text-[58px] lg:text-[66px]">
            {t("hero.title")}
          </h1>
          <p className="mt-6 max-w-[650px] text-base leading-8 text-zinc-300 sm:text-lg [@media(max-height:760px)]:mt-4">
            {t("hero.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 [@media(max-height:760px)]:mt-5">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-bold text-emerald-950 no-underline transition-colors hover:bg-emerald-300" href={navigation.createApplicationHref}>
              <Rocket aria-hidden="true" size={18} />
              {t("hero.primary")}
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 bg-transparent px-5 text-sm font-semibold text-white no-underline transition-colors hover:border-white/50 hover:bg-white/10" href={navigation.deploymentsHref}>
              {t("hero.secondary")}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-emerald-100 [@media(max-height:760px)]:mt-5">
            <CheckCircle2 aria-hidden="true" size={17} />
            {t("hero.availability")}
          </div>
          <div className="mt-10 grid max-w-[650px] grid-cols-3 border-y border-white/15 [@media(max-height:760px)]:mt-6">
            {metrics.map(([valueKey, labelKey], index) => (
              <div className={`min-w-0 py-4 pr-2 ${index > 0 ? "border-l border-white/15 pl-3 sm:pl-5" : ""}`} key={valueKey}>
                <strong className="block break-words text-xs font-semibold text-white sm:text-sm">{t(valueKey)}</strong>
                <span className="mt-1 block text-[11px] text-zinc-400 sm:text-xs">{t(labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
