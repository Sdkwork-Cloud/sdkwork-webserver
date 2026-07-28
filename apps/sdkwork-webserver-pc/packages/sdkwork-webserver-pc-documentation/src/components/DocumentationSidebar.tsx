import { Bot, Boxes, CloudCog, HelpCircle, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import type { DocumentationMessageKey } from "../i18n/index.ts";
import type { DocumentationTranslator } from "../services/documentation-translator.ts";

const sections = [
  { href: "#overview", icon: Sparkles, label: "sidebar.overview" },
  { href: "#quickstart", icon: Rocket, label: "sidebar.quickstart" },
  { href: "#applications", icon: Boxes, label: "sidebar.applications" },
  { href: "#deployment", icon: CloudCog, label: "sidebar.deployment" },
  { href: "#agents", icon: Bot, label: "sidebar.agents" },
  { href: "#security", icon: ShieldCheck, label: "sidebar.security" },
  { href: "#troubleshooting", icon: HelpCircle, label: "sidebar.troubleshooting" },
] as const satisfies readonly { href: string; icon: typeof Sparkles; label: DocumentationMessageKey }[];

export function DocumentationSidebar({ t }: { t: DocumentationTranslator }) {
  return (
    <aside className="sticky top-16 z-30 min-w-0 border-b border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0d1511] lg:h-[calc(100dvh-64px)] lg:border-b-0 lg:border-r">
      <nav className="flex min-w-0 overflow-x-auto px-4 py-2 sm:px-6 lg:grid lg:gap-1 lg:overflow-visible lg:px-5 lg:py-8" aria-label={t("sidebar.aria")}>
        {sections.map(({ href, icon: Icon, label }) => (
          <a className="flex min-h-10 shrink-0 items-center gap-2.5 border-b-2 border-transparent px-3 text-sm font-medium text-zinc-600 no-underline hover:border-emerald-600 hover:text-emerald-700 lg:border-b-0 lg:border-l-2 dark:text-zinc-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300" href={href} key={href}>
            <Icon aria-hidden="true" className="shrink-0" size={16} />
            {t(label)}
          </a>
        ))}
      </nav>
    </aside>
  );
}
