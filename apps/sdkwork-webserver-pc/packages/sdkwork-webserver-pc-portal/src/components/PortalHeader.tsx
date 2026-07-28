import { Bell, Boxes, Menu, SquareTerminal, X } from "lucide-react";
import { useState } from "react";
import type { PortalMessageKey } from "../i18n/index.ts";
import type { PortalTranslator } from "../services/portal-translator.ts";
import type { PortalViewer } from "../types.ts";

const navigationItems = [
  { href: "#capabilities", label: "nav.capabilities" },
  { href: "#workflow", label: "nav.workflow" },
  { href: "#skill", label: "nav.skill" },
  { href: "#security", label: "nav.security" },
] as const satisfies readonly { href: string; label: PortalMessageKey }[];

export function PortalHeader({
  consoleHref,
  notificationsHref,
  t,
  viewer,
}: {
  consoleHref: string;
  notificationsHref: string;
  t: PortalTranslator;
  viewer?: PortalViewer;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const viewerLabel = viewer?.label?.trim() || t("header.account");
  const viewerInitial = Array.from(viewerLabel)[0]?.toLocaleUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur dark:border-white/10 dark:bg-[#0d1511]/95 dark:text-white">
      <div className="grid h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(240px,1fr)_auto_minmax(240px,1fr)] 2xl:px-10">
        <a className="flex min-w-0 items-center gap-2.5 justify-self-start text-inherit no-underline" href="/" aria-label={t("brand.name")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950">
            <Boxes aria-hidden="true" size={19} strokeWidth={2.2} />
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <strong className="block truncate text-sm font-bold">{t("brand.name")}</strong>
            <span className="hidden truncate text-xs text-zinc-500 2xl:block dark:text-zinc-400">
              {t("brand.descriptor")}
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 justify-self-center xl:flex" aria-label={t("header.navigation")}>
          {navigationItems.map((item) => (
            <a
              className="relative flex min-h-10 items-center px-3 text-sm font-medium text-zinc-600 no-underline transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-emerald-600 after:transition-transform hover:text-zinc-950 hover:after:scale-x-100 focus-visible:text-zinc-950 focus-visible:after:scale-x-100 dark:text-zinc-300 dark:after:bg-emerald-400 dark:hover:text-white dark:focus-visible:text-white"
              href={item.href}
              key={item.href}
            >
              {t(item.label)}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 justify-self-end">
          <button
            aria-controls="portal-mobile-navigation"
            aria-expanded={navigationOpen}
            aria-label={navigationOpen ? t("header.closeNavigation") : t("header.openNavigation")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 xl:hidden dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
            onClick={() => setNavigationOpen((current) => !current)}
            title={navigationOpen ? t("header.closeNavigation") : t("header.openNavigation")}
            type="button"
          >
            {navigationOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>

          <a
            aria-label={t("header.notifications")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-600 no-underline transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:border-white/15 dark:hover:bg-white/5 dark:hover:text-emerald-300"
            href={notificationsHref}
            title={t("header.notifications")}
          >
            <Bell aria-hidden="true" size={18} />
          </a>

          <a
            aria-label={t("header.console")}
            className="inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 no-underline transition-colors hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 sm:w-auto sm:px-3.5 dark:border-white/15 dark:bg-transparent dark:text-zinc-100 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
            href={consoleHref}
          >
            <SquareTerminal aria-hidden="true" size={17} />
            <span className="hidden sm:inline">{t("header.console")}</span>
          </a>

          {viewer ? (
            <>
              <span aria-hidden="true" className="hidden h-6 w-px bg-zinc-200 sm:block dark:bg-white/15" />
              <a
                aria-label={t("header.accountAria", { user: viewerLabel })}
                className="flex min-w-0 items-center gap-2 text-zinc-700 no-underline transition-colors hover:text-emerald-700 dark:text-zinc-200 dark:hover:text-emerald-300"
                href={consoleHref}
                title={t("header.accountAria", { user: viewerLabel })}
              >
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-emerald-700/20 bg-emerald-100 text-xs font-bold text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-400/15 dark:text-emerald-200">
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
          className="absolute inset-x-0 top-full border-b border-zinc-200 bg-white xl:hidden dark:border-white/10 dark:bg-[#0d1511]"
          id="portal-mobile-navigation"
        >
          <div className="grid grid-cols-2 gap-x-4 px-4 py-2 sm:grid-cols-4 sm:px-6 lg:px-8">
            {navigationItems.map((item) => (
              <a
                className="flex min-h-11 items-center border-b border-transparent text-sm font-semibold text-zinc-700 no-underline transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:text-zinc-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
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
