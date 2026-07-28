import { Bell, BookOpen, Boxes, Home, SquareTerminal } from "lucide-react";
import type { DocumentationTranslator } from "../services/documentation-translator.ts";
import type { DocumentationNavigation, DocumentationViewer } from "../types.ts";

export function DocumentationHeader({
  navigation,
  t,
  viewer,
}: {
  navigation: DocumentationNavigation;
  t: DocumentationTranslator;
  viewer?: DocumentationViewer;
}) {
  const viewerLabel = viewer?.label?.trim();
  const viewerInitial = Array.from(viewerLabel || "U")[0]?.toLocaleUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 bg-white/95 text-zinc-950 shadow-[0_1px_0_rgba(24,24,27,0.08)] backdrop-blur dark:bg-[#0d1511]/95 dark:text-white dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="grid h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 lg:grid-cols-[minmax(200px,1fr)_auto_minmax(200px,1fr)] lg:px-8 2xl:px-10">
        <a className="flex min-w-0 items-center gap-2 justify-self-start whitespace-nowrap text-inherit no-underline" href={navigation.portalHref} aria-label={t("brand.name")}>
          <span className="grid size-8 shrink-0 place-items-center rounded bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950">
            <Boxes aria-hidden="true" size={17} strokeWidth={2.2} />
          </span>
          <strong className="hidden min-w-0 truncate text-sm font-bold sm:block">{t("brand.name")}</strong>
        </a>

        <nav className="hidden items-center gap-1 justify-self-center lg:flex" aria-label={t("sidebar.aria")}>
          <a className="inline-flex min-h-8 items-center gap-2 whitespace-nowrap px-2.5 text-[13px] font-medium text-zinc-600 no-underline hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300" href={navigation.portalHref}>
            <Home aria-hidden="true" size={16} />
            {t("header.home")}
          </a>
          <a aria-current="page" className="relative inline-flex min-h-8 items-center gap-2 whitespace-nowrap px-2.5 text-[13px] font-semibold text-zinc-950 no-underline after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-emerald-600 dark:text-white dark:after:bg-emerald-400" href="/docs">
            <BookOpen aria-hidden="true" size={16} />
            {t("header.documentation")}
          </a>
        </nav>

        <div className="flex min-w-0 items-center gap-1.5 justify-self-end whitespace-nowrap">
          <a
            aria-label={t("header.home")}
            className="inline-flex size-8 items-center justify-center rounded text-zinc-600 no-underline hover:bg-zinc-100 hover:text-emerald-700 lg:hidden dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-emerald-300"
            href={navigation.portalHref}
            title={t("header.home")}
          >
            <Home aria-hidden="true" size={18} />
          </a>
          <a
            aria-label={t("header.notifications")}
            className="inline-flex size-8 items-center justify-center rounded text-zinc-600 no-underline hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-emerald-300"
            href={navigation.notificationsHref}
            title={t("header.notifications")}
          >
            <Bell aria-hidden="true" size={18} />
          </a>
          <a
            aria-label={t("header.console")}
            className="inline-flex min-h-8 items-center gap-2 rounded bg-zinc-100 px-3 text-[13px] font-semibold text-zinc-800 no-underline hover:bg-emerald-50 hover:text-emerald-800 dark:bg-white/8 dark:text-zinc-100 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
            href={navigation.consoleHref}
            title={t("header.console")}
          >
            <SquareTerminal aria-hidden="true" size={17} />
            <span className="hidden sm:inline">{t("header.console")}</span>
          </a>
          {viewerLabel ? (
            <a
              aria-label={t("header.accountAria", { user: viewerLabel })}
              className="ml-1 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 no-underline dark:bg-emerald-400/15 dark:text-emerald-200"
              href={navigation.consoleHref}
              title={t("header.accountAria", { user: viewerLabel })}
            >
              {viewerInitial}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
