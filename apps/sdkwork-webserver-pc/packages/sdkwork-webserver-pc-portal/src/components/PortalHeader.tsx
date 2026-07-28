import { Bell, Boxes, Menu, SquareTerminal, X } from "lucide-react";
import { useState } from "react";
import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalNavigation, PortalViewer } from "../types.ts";

export function PortalHeader({
  navigation,
  t,
  viewer,
}: {
  navigation: PortalNavigation;
  t: PortalTranslator;
  viewer?: PortalViewer;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const viewerLabel = viewer?.label?.trim() || t("header.account");
  const viewerInitial = Array.from(viewerLabel)[0]?.toLocaleUpperCase() ?? "U";
  const navigationItems = [
    { href: "/", label: "nav.home" },
    { href: "#skill", label: "nav.skill" },
    { href: "#capabilities", label: "nav.capabilities" },
    { href: "#workflow", label: "nav.workflow" },
    { href: navigation.documentationHref, label: "nav.documentation" },
  ] as const satisfies readonly { href: string; label: PortalMessageKey }[];

  return (
    <header className="sticky top-0 z-50 bg-white/95 text-zinc-950 shadow-[0_1px_0_rgba(24,24,27,0.08)] backdrop-blur dark:bg-[#0d1511]/95 dark:text-white dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="grid h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] 2xl:px-10">
        <a className="flex min-w-0 items-center gap-2 justify-self-start whitespace-nowrap text-inherit no-underline" href="/" aria-label={t("brand.name")}>
          <span className="grid size-8 shrink-0 place-items-center rounded bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950">
            <Boxes aria-hidden="true" size={17} strokeWidth={2.2} />
          </span>
          <strong className="hidden min-w-0 truncate text-sm font-bold sm:block">{t("brand.name")}</strong>
        </a>

        <nav className="hidden items-center gap-1 justify-self-center xl:flex" aria-label={t("header.navigation")}>
          {navigationItems.map((item) => (
            <a
              className="relative flex min-h-8 items-center whitespace-nowrap px-2.5 text-[13px] font-medium text-zinc-600 no-underline transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-emerald-600 after:transition-transform hover:text-zinc-950 hover:after:scale-x-100 focus-visible:text-zinc-950 focus-visible:after:scale-x-100 dark:text-zinc-300 dark:after:bg-emerald-400 dark:hover:text-white dark:focus-visible:text-white"
              href={item.href}
              key={item.href}
            >
              {t(item.label)}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-1.5 justify-self-end whitespace-nowrap">
          <button
            aria-controls="portal-mobile-navigation"
            aria-expanded={navigationOpen}
            aria-label={navigationOpen ? t("header.closeNavigation") : t("header.openNavigation")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 xl:hidden dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
            onClick={() => setNavigationOpen((current) => !current)}
            title={navigationOpen ? t("header.closeNavigation") : t("header.openNavigation")}
            type="button"
          >
            {navigationOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>

          <a
            aria-label={t("header.notifications")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded text-zinc-600 no-underline transition-colors hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-emerald-300"
            href={navigation.notificationsHref}
            title={t("header.notifications")}
          >
            <Bell aria-hidden="true" size={18} />
          </a>

          <a
            aria-label={t("header.console")}
            className="inline-flex size-8 shrink-0 items-center justify-center gap-2 rounded bg-zinc-100 text-[13px] font-semibold text-zinc-800 no-underline transition-colors hover:bg-emerald-50 hover:text-emerald-800 sm:w-auto sm:px-3 dark:bg-white/8 dark:text-zinc-100 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
            href={navigation.consoleHref}
          >
            <SquareTerminal aria-hidden="true" size={17} />
            <span className="hidden sm:inline">{t("header.console")}</span>
          </a>

          {viewer ? (
            <>
              <span aria-hidden="true" className="hidden h-5 w-px bg-zinc-200 sm:block dark:bg-white/15" />
              <a
                aria-label={t("header.accountAria", { user: viewerLabel })}
                className="flex min-w-0 items-center gap-2 whitespace-nowrap text-zinc-700 no-underline transition-colors hover:text-emerald-700 dark:text-zinc-200 dark:hover:text-emerald-300"
                href={navigation.consoleHref}
                title={t("header.accountAria", { user: viewerLabel })}
              >
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                  {viewerInitial}
                </span>
                <span className="hidden max-w-[160px] truncate text-sm font-semibold md:block">{viewerLabel}</span>
              </a>
            </>
          ) : null}
        </div>
      </div>

      {navigationOpen ? (
        <nav
          aria-label={t("header.navigation")}
          className="absolute inset-x-0 top-full bg-white shadow-[0_1px_0_rgba(24,24,27,0.08)] xl:hidden dark:bg-[#0d1511] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]"
          id="portal-mobile-navigation"
        >
          <div className="grid grid-cols-2 gap-x-4 px-4 py-2 sm:grid-cols-5 sm:px-6 lg:px-8">
            {navigationItems.map((item) => (
              <a
                className="flex min-h-10 items-center whitespace-nowrap text-sm font-semibold text-zinc-700 no-underline transition-colors hover:text-emerald-700 dark:text-zinc-200 dark:hover:text-emerald-300"
                href={item.href}
                key={item.href}
                onClick={() => setNavigationOpen(false)}
              >
                {t(item.label)}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
