import { Bot, Cloud, PackageCheck, ShieldCheck } from "lucide-react";
import { usePortalStatistics } from "../hooks/use-portal-statistics.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalStatisticsPort } from "../types.ts";

export function PortalStatistics({
  agentCount,
  statistics,
  t,
}: {
  agentCount: number;
  statistics?: PortalStatisticsPort;
  t: PortalTranslator;
}) {
  const state = usePortalStatistics(statistics);
  const deployedApplications = state.status === "ready"
    ? state.snapshot.deployedApplications
    : state.status === "loading"
      ? t("metrics.loading")
      : state.status === "error"
        ? t("metrics.unavailable")
        : t("metrics.signIn");
  const metrics = [
    {
      description: t("metrics.applications.description"),
      icon: Cloud,
      label: t("metrics.applications.label"),
      value: deployedApplications,
    },
    {
      description: t("metrics.agents.description"),
      icon: Bot,
      label: t("metrics.agents.label"),
      value: String(agentCount),
    },
    {
      description: t("metrics.profiles.description"),
      icon: PackageCheck,
      label: t("metrics.profiles.label"),
      value: "2",
    },
    {
      description: t("metrics.controls.description"),
      icon: ShieldCheck,
      label: t("metrics.controls.label"),
      value: "4",
    },
  ] as const;

  return (
    <div className="mt-9 grid max-w-[840px] grid-cols-2 border-y border-white/15 lg:grid-cols-4" aria-label={t("metrics.ariaLabel")}>
      {metrics.map(({ description, icon: Icon, label, value }, index) => (
        <div
          className={`min-w-0 py-4 pr-3 ${index % 2 === 1 ? "border-l border-white/15 pl-4" : ""} ${index >= 2 ? "border-t border-white/15 lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-white/15 lg:pl-5" : ""}`}
          key={label}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <Icon aria-hidden="true" size={15} />
            {label}
          </span>
          <strong className="mt-2 block min-h-8 break-words text-xl font-bold text-white sm:text-2xl">{value}</strong>
          <span className="mt-1 block text-[11px] leading-4 text-zinc-400">{description}</span>
        </div>
      ))}
    </div>
  );
}
