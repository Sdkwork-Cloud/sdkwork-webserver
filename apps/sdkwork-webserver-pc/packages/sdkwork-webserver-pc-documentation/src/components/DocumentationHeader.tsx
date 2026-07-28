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
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur dark:border-white/10 dark:bg-[#0d1511]/95 dark:text-white">
      <div className="grid h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] lg:px-8 2xl:px-10">
        <a className="flex min-w-0 items-center gap-2.5 justify-self-start text-inherit no-underline" href={navigation.portalHref} aria-label={t("brand.name")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950">
            <Boxes aria-hidden="true" size={19} strokeWidth={2.2} />
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <strong className="block truncate text-sm font-bold">{t("brand.name")}</strong>
            <span className="hidden truncate text-xs text-zinc-500 xl:block dark:text-zinc-400">{t("brand.descriptor")}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 justify-self-center lg:flex" aria-label={t("sidebar.aria")}>
          <a className="inline-flex min-h-10 items-center gap-2 px-3 text-sm font-medium text-zinc-600 no-underline hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300" href={navigation.portalHref}>
            <Home aria-hidden="true" size={16} />
            {t("header.home")}
          </a>
          <a aria-current="page" className="inline-flex min-h-10 items-center gap-2 border-b-2 border-emerald-600 px-3 text-sm font-semibold text-zinc-950 no-underline dark:border-emerald-400 dark:text-white" href="/docs">
            <BookOpen aria-hidden="true" size={16} />
            {t("header.documentation")}
          </a>
        </nav>

        <div className="flex min-w-0 items-center gap-2 justify-self-end">
          <a
            aria-label={t("header.home")}
            className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 no-underline hover:bg-zinc-100 hover:text-emerald-700 lg:hidden dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300"
            href={navigation.portalHref}
            title={t("header.home")}
          >
            <Home aria-hidden="true" size={18} />
          </a>
          <a
            aria-label={t("header.notifications")}
            className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 no-underline hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300"
            href={navigation.notificationsHref}
            title={t("header.notifications")}
          >
            <Bell aria-hidden="true" size={18} />
          </a>
          <a className="inline-flex min-h-9 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-800 no-underline hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 dark:border-white/15 dark:text-zinc-100 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200" href={navigation.consoleHref}>
            <SquareTerminal aria-hidden="true" size={17} />
            <span className="hidden sm:inline">{t("header.console")}</span>
          </a>
          {viewerLabel ? (
            <a
              aria-label={t("header.accountAria", { user: viewerLabel })}
              className="ml-1 grid size-9 shrink-0 place-items-center rounded-full border border-emerald-700/20 bg-emerald-100 text-xs font-bold text-emerald-800 no-underline dark:border-emerald-300/25 dark:bg-emerald-400/15 dark:text-emerald-200"
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
