import { ArrowRight, BookOpen, CheckCircle2, CloudCog, Rocket } from "lucide-react";
import { portalAgentCount } from "../data/portal-agent-catalog.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalNavigation, PortalStatisticsPort } from "../types.ts";
import { CloudTopologyScene } from "./CloudTopologyScene.tsx";
import { PortalStatistics } from "./PortalStatistics.tsx";

export function PortalHero({
  navigation,
  statistics,
  t,
}: {
  navigation: PortalNavigation;
  statistics?: PortalStatisticsPort;
  t: PortalTranslator;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#10231b] text-white">
      <CloudTopologyScene t={t} />
      <div className="absolute inset-y-0 left-0 w-full bg-[#10231b] lg:w-[57%]" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[480px] max-w-[1280px] items-center px-5 pt-8 pb-4 sm:px-7 sm:py-14 lg:px-10">
        <div className="w-full max-w-[840px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-950/70 px-3 py-2 text-xs font-semibold text-emerald-100">
            <CloudCog aria-hidden="true" size={16} />
            {t("hero.kicker")}
          </div>
          <h1 className="m-0 max-w-[680px] text-[42px] font-bold leading-[1.08] sm:text-[52px] lg:text-[58px]">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-[700px] text-base leading-7 text-zinc-300 sm:text-lg">
            {t("hero.description")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-bold text-emerald-950 no-underline transition-colors hover:bg-emerald-300" href={navigation.createApplicationHref}>
              <Rocket aria-hidden="true" size={18} />
              {t("hero.primary")}
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 bg-transparent px-5 text-sm font-semibold text-white no-underline transition-colors hover:border-white/50 hover:bg-white/10" href={navigation.deploymentsHref}>
              {t("hero.secondary")}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-emerald-100 no-underline transition-colors hover:text-white" href={navigation.documentationHref}>
              <BookOpen aria-hidden="true" size={18} />
              {t("hero.documentation")}
            </a>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-emerald-100">
            <CheckCircle2 aria-hidden="true" size={17} />
            {t("hero.availability")}
          </div>
          <PortalStatistics agentCount={portalAgentCount} statistics={statistics} t={t} />
        </div>
      </div>
    </section>
  );
}
