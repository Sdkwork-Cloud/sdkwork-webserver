import { Check, Cloud, Code2, Globe2, ServerCog } from "lucide-react";
import type { PortalTranslator } from "../services/portal-translator.ts";

export function CloudTopologyScene({ t }: { t: PortalTranslator }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-30 sm:w-[82%] lg:w-[58%] lg:opacity-100" aria-hidden="true">
      <div className="absolute left-[12%] top-[17%] h-[66%] border-l border-emerald-300/20" />
      <div className="absolute left-[12%] right-[5%] top-[32%] border-t border-emerald-300/20" />
      <div className="absolute left-[12%] right-[5%] top-[66%] border-t border-emerald-300/20" />
      <div className="absolute right-[13%] top-[18%] h-[64%] border-l border-emerald-300/20" />
      <SceneNode className="left-[30%] top-[18%]" icon={Code2} label={t("scene.source")} status={t("scene.sourceStatus")} />
      <SceneNode className="left-[34%] top-[43%]" icon={ServerCog} label={t("scene.orchestration")} status={t("scene.orchestrationStatus")} emphasized />
      <SceneNode className="right-[6%] top-[18%]" icon={Globe2} label={t("scene.edge")} status={t("scene.edgeStatus")} />
      <div className="absolute bottom-[17%] right-[7%] flex w-[52%] min-w-[270px] items-center justify-between border border-white/10 bg-[#152d24] p-3 shadow-2xl">
        <RegionStatus icon={Cloud} label={t("scene.regionPrimary")} />
        <span className="h-px flex-1 bg-emerald-300/30" />
        <RegionStatus icon={ServerCog} label={t("scene.regionEdge")} />
      </div>
      <span className="absolute left-[11.4%] top-[31.2%] size-2 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
      <span className="absolute right-[12.4%] top-[65.2%] size-2 rounded-full bg-sky-300 motion-safe:animate-pulse" />
    </div>
  );
}

function SceneNode({
  className,
  emphasized = false,
  icon: Icon,
  label,
  status,
}: {
  className: string;
  emphasized?: boolean;
  icon: typeof Code2;
  label: string;
  status: string;
}) {
  return (
    <div className={`absolute w-[210px] border p-4 shadow-2xl ${className} ${emphasized ? "border-emerald-300/50 bg-emerald-950" : "border-white/15 bg-[#183128]"}`}>
      <div className="mb-6 flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-md bg-white/10 text-emerald-200">
          <Icon size={18} />
        </span>
        <span className="size-2 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
      </div>
      <strong className="block text-sm text-white">{label}</strong>
      <span className="mt-1 flex items-center gap-1.5 text-xs text-emerald-200">
        <Check size={13} />
        {status}
      </span>
    </div>
  );
}

function RegionStatus({ icon: Icon, label }: { icon: typeof Cloud; label: string }) {
  return (
    <span className="flex items-center gap-2 px-2 text-xs font-medium text-zinc-200">
      <Icon size={15} className="text-sky-300" />
      {label}
    </span>
  );
}

