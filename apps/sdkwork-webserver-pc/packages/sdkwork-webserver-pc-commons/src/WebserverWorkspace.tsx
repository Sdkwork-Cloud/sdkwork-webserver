import {
  Activity,
  AppWindow,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Filter,
  FileArchive,
  FolderOpen,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { translateWebserver, type WebserverLocale, type WebserverMessageKey } from "./i18n/index.ts";
import {
  hasPlatformSuperAdminAccess,
  hasWebserverPermission,
  hasWebserverSuperAdminAccess,
} from "./permissions.ts";
import type {
  WebserverPageInfo,
  WebserverPcModuleDefinition,
  WebserverResourceAction,
  WebserverResourceActionContext,
  WebserverResourceDataSource,
  WebserverResourceFieldOptionValue,
  WebserverResourceFieldOptions,
  WebserverResourceKey,
  WebserverResourceRegistry,
} from "./types.ts";
import { WorkspaceHeader, WorkspaceSidebar } from "./WebserverWorkspaceChrome.tsx";

export interface WebserverWorkspaceProps {
  locale: WebserverLocale;
  modules: readonly WebserverPcModuleDefinition[];
  notificationsHref?: string;
  onSignOut?(): void;
  permissionScope: readonly string[];
  portalHref?: string;
  registry: WebserverResourceRegistry;
  surface: "app-console" | "backend-admin";
  userLabel?: string;
}

export function WebserverWorkspace({
  locale,
  modules,
  notificationsHref,
  onSignOut,
  permissionScope,
  portalHref,
  registry,
  surface,
  userLabel,
}: WebserverWorkspaceProps) {
  const t = (key: WebserverMessageKey, values?: Record<string, string | number>) =>
    translateWebserver(locale, key, values);
  const entries = useMemo(() => {
    const availableEntries = modules.flatMap((module) => module.entries);
    return availableEntries
      .filter((entry) =>
        surface === "app-console"
        || hasWebserverPermission(permissionScope, entry.permission),
      )
      .sort((a, b) => a.order - b.order);
  }, [modules, permissionScope, surface]);
  const basePath = surface === "backend-admin" ? "/admin" : "/console";
  const defaultResource = entries[0]?.resource;
  const adminRole = surface === "backend-admin"
    ? hasPlatformSuperAdminAccess(permissionScope)
      ? t("auth.platformSuperAdmin")
      : hasWebserverSuperAdminAccess(permissionScope)
        ? t("auth.webSuperAdmin")
        : t("auth.webAdministrator")
    : undefined;

  return (
    <div className="app-layout">
      <WorkspaceHeader
        adminRole={adminRole}
        basePath={basePath}
        notificationsHref={notificationsHref}
        onSignOut={onSignOut}
        portalHref={portalHref}
        surface={surface}
        t={t}
        userLabel={userLabel}
      />
      <WorkspaceSidebar basePath={basePath} entries={entries} t={t} />
      <main className="workspace">
        {defaultResource ? (
          <Routes>
            {entries.map((entry) => (
              <Route
                key={entry.resource}
                path={`/${entry.resource}`}
                element={(
                  <ResourcePage
                    entry={entry}
                    locale={locale}
                    permissionScope={permissionScope}
                    registry={registry}
                    source={registry[entry.resource]}
                  />
                )}
              />
            ))}
            <Route path="*" element={<Navigate to={`${basePath}/${defaultResource}`} replace />} />
          </Routes>
        ) : (
          <SurfaceAccessState locale={locale} />
        )}
      </main>
    </div>
  );
}

function SurfaceAccessState({ locale }: { locale: WebserverLocale }) {
  const t = (key: WebserverMessageKey, values: Record<string, string | number> = {}) => (
    translateWebserver(locale, key, values)
  );
  return (
    <section className="surface-access-state" role="alert">
      <Shield aria-hidden="true" size={22} />
      <h1>{t("access.title")}</h1>
      <p>{t("access.description")}</p>
    </section>
  );
}

function ResourcePage({
  entry,
  locale,
  permissionScope,
  registry,
  source,
}: {
  entry: { permission: string; resource: WebserverResourceKey };
  locale: WebserverLocale;
  permissionScope: readonly string[];
  registry: WebserverResourceRegistry;
  source?: WebserverResourceDataSource;
}) {
  const t = (key: WebserverMessageKey, values?: Record<string, string | number>) =>
    translateWebserver(locale, key, values);
  const authorized = hasWebserverPermission(permissionScope, entry.permission);
  const scopeKind = source?.scopeKind ?? "site";
  const scopeSource = scopeKind === "application" ? registry.applications : registry.sites;
  const scopeStorageKey = `sdkwork.webserver.${scopeKind}Id`;
  const [items, setItems] = useState<readonly Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<WebserverPageInfo>({ page: 1, pageSize: 20, hasMore: false });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scopeId, setScopeId] = useState(() => sessionStorage.getItem(scopeStorageKey) ?? "");
  const [scopeOptions, setScopeOptions] = useState<readonly ScopeOption[]>([]);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [action, setAction] = useState<WebserverResourceAction>();
  const visibleActions = useMemo(
    () => source?.actions.filter((candidate) =>
      !candidate.permission
      || hasWebserverPermission(permissionScope, candidate.permission),
    ) ?? [],
    [permissionScope, source],
  );

  function persistScope(value: string): void {
    setScopeId(value);
    setPage(1);
    setSelected(undefined);
    if (value) sessionStorage.setItem(scopeStorageKey, value);
    else sessionStorage.removeItem(scopeStorageKey);
  }

  async function load(filterValues: Readonly<Record<string, string>> = filters): Promise<void> {
    if (!authorized || !source || (source.requiresScope && !scopeId)) {
      setItems([]);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await source.load({
        filters: source.filters?.length ? filterValues : undefined,
        page,
        pageSize: 20,
        scopeId: scopeId || undefined,
        search: search.trim() || undefined,
      });
      setItems(result.items);
      setPageInfo(result.pageInfo);
    } catch {
      setError(t("error.operation"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!authorized || !source?.requiresScope || !scopeSource) {
      setScopeOptions([]);
      return undefined;
    }
    let active = true;
    setScopeBusy(true);
    void scopeSource.load({ page: 1, pageSize: 100 })
      .then((result) => {
        if (!active) return;
        const options = result.items
          .map((item) => scopeOption(item, scopeKind))
          .filter((option): option is ScopeOption => Boolean(option));
        setScopeOptions(options);
        const nextScopeId = options.some((option) => option.id === scopeId)
          ? scopeId
          : options[0]?.id ?? "";
        persistScope(nextScopeId);
      })
      .catch(() => {
        if (active) setError(t("error.operation"));
      })
      .finally(() => {
        if (active) setScopeBusy(false);
      });
    return () => {
      active = false;
    };
  }, [authorized, entry.resource, scopeSource]);

  useEffect(() => {
    void load();
  }, [authorized, entry.resource, page, scopeId]);
  useEffect(() => {
    setPage(1);
    setSelected(undefined);
  }, [entry.resource]);

  const columns = useMemo(
    () => resourceColumns(entry.resource, items),
    [entry.resource, items],
  );
  const scopeLabel = t(scopeKind === "application" ? "toolbar.application" : "toolbar.site");
  const resourceLabel = resourceText(t, entry.resource, "label");

  return (
    <section aria-label={resourceLabel} className="resource-page">
      <div className="resource-commandbar">
        <div className="resource-identity">
          <h1>{resourceLabel}</h1>
        </div>
        {authorized ? (
          <>
            <div className="resource-query">
              {source?.requiresScope ? (
                <label className="scope-selector">
                  <AppWindow aria-hidden="true" size={16} />
                  <select
                    aria-label={scopeLabel}
                    disabled={scopeBusy || scopeOptions.length === 0}
                    onChange={(event) => persistScope(event.target.value)}
                    value={scopeId}
                  >
                    {scopeOptions.length === 0 ? (
                      <option value="">{scopeBusy ? t("scope.loading") : t("scope.none")}</option>
                    ) : null}
                    {scopeOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <form
                className="search-box"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  void load();
                }}
                role="search"
              >
                <Search aria-hidden="true" size={16} />
                <input
                  aria-label={t("toolbar.search")}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("toolbar.search")}
                  value={search}
                />
              </form>
              {source?.filters?.length ? (
                <button
                  aria-expanded={filtersOpen}
                  className="secondary-button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  type="button"
                >
                  <Filter aria-hidden="true" size={16} />
                  {t("toolbar.filters")}
                  {activeFilterCount(filters) > 0 ? <span className="filter-count">{activeFilterCount(filters)}</span> : null}
                </button>
              ) : null}
            </div>
            <div className="actions">
              {visibleActions.map((candidate) => (
                <button
                  className={candidate.dangerous
                    ? "danger-button"
                    : candidate.requiresSelection
                      ? "secondary-button"
                      : "command-button"}
                  disabled={busy
                    || (candidate.requiresSelection && !selected)
                    || (candidate.requiresScope && !scopeId)
                    || !actionAvailable(candidate, selected, scopeId)}
                  key={candidate.id}
                  onClick={() => setAction(candidate)}
                  type="button"
                >
                  <ActionIcon action={candidate} />
                  {actionText(t, entry.resource, candidate)}
                </button>
              ))}
              <button
                aria-label={t("toolbar.refresh")}
                className="icon-button refresh-button"
                disabled={busy}
                onClick={() => void load()}
                title={t("toolbar.refresh")}
                type="button"
              >
                <RefreshCw aria-hidden="true" className={busy ? "is-spinning" : undefined} size={17} />
              </button>
            </div>
          </>
        ) : null}
      </div>

      {!authorized ? (
        <div className="resource-access-state" role="status">
          <LockKeyhole aria-hidden="true" size={22} />
          <div>
            <strong>{t("access.resource.title")}</strong>
            <p>{t("access.resource.description")}</p>
          </div>
        </div>
      ) : (
        <>
          {filtersOpen && source?.filters?.length ? (
            <form
              className="filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                void load();
              }}
            >
              {source.filters.map((filter) => (
                <label key={filter.id}>
                  <span>{fieldLabel(filter.id, locale)}</span>
                  {filter.type === "select" ? (
                    <select
                      onChange={(event) => setFilters((current) => ({ ...current, [filter.id]: event.target.value }))}
                      value={filters[filter.id] ?? ""}
                    >
                      <option value="">{t("filters.all")}</option>
                      {filter.fieldOptions?.map((option) => (
                        <option key={String(optionValue(option))} value={String(optionValue(option))}>
                          {optionLabel(option, filter.id, locale)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      onChange={(event) => setFilters((current) => ({ ...current, [filter.id]: event.target.value }))}
                      type={filter.type}
                      value={filters[filter.id] ?? ""}
                    />
                  )}
                </label>
              ))}
              <div className="filter-actions">
                <button
                  className="secondary-button"
                  disabled={activeFilterCount(filters) === 0}
                  onClick={() => {
                    setFilters({});
                    setPage(1);
                    void load({});
                  }}
                  type="button"
                >
                  {t("filters.reset")}
                </button>
                <button className="command-button" type="submit">{t("filters.apply")}</button>
              </div>
            </form>
          ) : null}
          {error ? (
            <div className="error-banner" role="alert">
              {error}
              <button
                aria-label={t("toolbar.dismiss")}
                className="icon-button"
                onClick={() => setError(undefined)}
                title={t("toolbar.dismiss")}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>
          ) : null}
          {source?.requiresScope && !scopeId ? (
            <div className="empty-state empty-state-standalone">
              <AppWindow aria-hidden="true" size={20} />
              <span>{t("scope.none.description")}</span>
            </div>
          ) : (
            <div className="data-surface">
              <div aria-busy={busy} className="table-frame">
                {busy && items.length > 0 ? <span aria-hidden="true" className="table-loading-bar" /> : null}
                {busy && items.length === 0 ? (
                  <div className="empty-state" role="status">
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={20} />
                    <span>{t("table.loading")}</span>
                  </div>
                ) : items.length === 0 ? (
                  <div className="empty-state">
                    <Inbox aria-hidden="true" size={20} />
                    <span>{t("table.empty")}</span>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th aria-label={t("table.select")} />
                        {columns.map((column) => <th key={column}>{fieldLabel(column, locale)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          className={selected === item ? "selected" : ""}
                          key={recordKey(item, index)}
                          onClick={() => setSelected(item)}
                        >
                          <td>
                            <input
                              aria-label={t("table.selectRow", { row: index + 1 })}
                              checked={selected === item}
                              readOnly
                              type="radio"
                            />
                          </td>
                          {columns.map((column) => (
                            <td key={column}>{displayValue(item[column], column, entry.resource, locale)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {(items.length > 0 || busy || page > 1) ? (
                <footer className="pagination">
                  <span>
                    {pageInfo.total === undefined
                      ? t("pagination.page", { page: pageInfo.page })
                      : t("pagination.total", { total: pageInfo.total })}
                  </span>
                  <button
                    aria-label={t("pagination.previous")}
                    className="icon-button"
                    disabled={page <= 1 || busy}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    title={t("pagination.previous")}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" size={18} />
                  </button>
                  <button
                    aria-label={t("pagination.next")}
                    className="icon-button"
                    disabled={!pageInfo.hasMore || busy}
                    onClick={() => setPage((value) => value + 1)}
                    title={t("pagination.next")}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
                </footer>
              ) : null}
            </div>
          )}
          {action ? (
            <ActionDialog
              action={action}
              label={actionText(t, entry.resource, action)}
              locale={locale}
              onClose={() => setAction(undefined)}
              onComplete={() => {
                setAction(undefined);
                void load();
              }}
              onRefresh={() => void load()}
              scopeId={scopeId || undefined}
              selected={selected}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function ActionIcon({ action }: { action: WebserverResourceAction }) {
  const iconProps = { "aria-hidden": true, size: 15 } as const;
  if (action.id.includes("rollback")) return <RotateCcw {...iconProps} />;
  if (action.id.includes("delete")) return <Trash2 {...iconProps} />;
  if (action.id.includes("pause")) return <Pause {...iconProps} />;
  if (action.id.includes("activate")) return <Play {...iconProps} />;
  if (action.id.includes("verify")) return <BadgeCheck {...iconProps} />;
  if (action.id.includes("deploy")) return <Rocket {...iconProps} />;
  if (action.id.includes("reload") || action.id.includes("renew")) return <RefreshCw {...iconProps} />;
  if (action.id.includes("update")) return <Pencil {...iconProps} />;
  if (action.id.includes("create")) return <Plus {...iconProps} />;
  if (action.id.includes("diagnostic")) return <Activity {...iconProps} />;
  return <Settings2 {...iconProps} />;
}

function ActionDialog({
  action,
  label,
  locale,
  onClose,
  onComplete,
  onRefresh,
  scopeId,
  selected,
}: {
  action: WebserverResourceAction;
  label: string;
  locale: WebserverLocale;
  onClose(): void;
  onComplete(): void;
  onRefresh(): void;
  scopeId?: string;
  selected?: Record<string, unknown>;
}) {
  const t = (key: WebserverMessageKey) => translateWebserver(locale, key);
  const [body, setBody] = useState<Record<string, unknown>>(() => initialActionBody(action, selected));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File>();
  const [files, setFiles] = useState<readonly File[]>([]);
  const [fieldOptions, setFieldOptions] = useState<WebserverResourceFieldOptions>(action.fieldOptions ?? {});
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID());
  const [optionsBusy, setOptionsBusy] = useState(Boolean(action.loadFieldOptions));
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Record<string, unknown>>();
  const [copiedField, setCopiedField] = useState<string>();
  const [sourceInputMode, setSourceInputMode] = useState<"archive" | "directory">("archive");
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const confirmationRequired = Boolean(action.dangerous || action.requiresConfirmation);
  const sourceInputRequired = Boolean(action.sourceInput);

  useEffect(() => {
    const input = sourceInputRef.current;
    if (!input) return;
    if (sourceInputMode === "directory") {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      return;
    }
    input.removeAttribute("webkitdirectory");
    input.removeAttribute("directory");
  }, [sourceInputMode]);

  useEffect(() => {
    if (!action.loadFieldOptions) return undefined;
    let active = true;
    setOptionsBusy(true);
    setError(undefined);
    void action.loadFieldOptions({ body: initialActionBody(action, selected), scopeId, selectedItem: selected })
      .then((loadedOptions) => {
        if (!active) return;
        const mergedOptions = { ...action.fieldOptions, ...loadedOptions };
        setFieldOptions(mergedOptions);
        setBody((current) => {
          const next = { ...current };
          for (const [name, options] of Object.entries(mergedOptions)) {
            if ((next[name] === "" || next[name] === undefined) && options.length > 0) {
              next[name] = optionValue(options[0]);
            }
          }
          return next;
        });
      })
      .catch(() => {
        if (active) setError(t("error.options"));
      })
      .finally(() => {
        if (active) setOptionsBusy(false);
      });
    return () => {
      active = false;
    };
  }, [action, scopeId, selected]);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (
      (confirmationRequired && !confirmed)
      || (action.requiresFile && !file)
      || (sourceInputRequired && files.length === 0)
    ) return;
    setBusy(true);
    setError(undefined);
    setProgress(0);
    try {
      const response = await action.execute({
        body,
        file,
        files,
        idempotencyKey,
        onProgress: (value) => setProgress(Math.max(0, Math.min(100, Math.round(value)))),
        scopeId,
        selectedItem: selected,
        sourceInputMode,
      });
      if (action.resultFields?.length && isRecord(response)) {
        setResult(response);
        onRefresh();
        return;
      }
      onComplete();
    } catch {
      setError(t("error.operation"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="presentation"
    >
      <form
        aria-labelledby="action-title"
        aria-modal="true"
        className="dialog"
        onSubmit={(event) => void submit(event)}
        role="dialog"
      >
        <header>
          <div>
            <span className="eyebrow">{t("dialog.command")}</span>
            <h2 id="action-title">{label}</h2>
          </div>
          <button
            aria-label={t("dialog.close")}
            className="icon-button"
            onClick={onClose}
            title={t("dialog.close")}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        {result ? (
          <div className="operation-result" role="status">
            <div className="result-notice"><Check aria-hidden="true" size={18} />{t("dialog.operationComplete")}</div>
            {"agentToken" in result ? <div className="warning">{t("dialog.oneTimeCredential")}</div> : null}
            <dl>
              {action.resultFields?.map((field) => field in result ? (
                <div key={field}>
                  <dt>{fieldLabel(field, locale)}</dt>
                  <dd>
                    <code>{String(result[field] ?? "-")}</code>
                    <button
                      aria-label={t("dialog.copyField")}
                      className="icon-button"
                      onClick={() => {
                        void navigator.clipboard.writeText(String(result[field] ?? ""));
                        setCopiedField(field);
                      }}
                      title={t("dialog.copyField")}
                      type="button"
                    >
                      {copiedField === field ? <Check aria-hidden="true" size={16} /> : <Clipboard aria-hidden="true" size={16} />}
                    </button>
                  </dd>
                </div>
              ) : null)}
            </dl>
          </div>
        ) : null}
        {!result && confirmationRequired ? <div className="warning">{t("dialog.warning")}</div> : null}
        {!result ? <div className="form-grid">
          {Object.entries(body).map(([name, value]) => (
            <Field
              key={name}
              locale={locale}
              name={name}
              onChange={(next) => setBody((current) => ({ ...current, [name]: next }))}
              options={fieldOptions[name]}
              value={value}
            />
          ))}
        </div> : null}
        {!result && action.requiresFile ? (
          <label className="file-field">
            <span><Upload aria-hidden="true" size={16} />{t("dialog.file")}</span>
            <input
              accept={action.acceptedFileTypes}
              disabled={busy}
              onChange={(event) => setFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {!result && action.sourceInput ? (
          <div className="source-picker">
            <div aria-label={t("dialog.sourceMode")} className="source-mode-toggle" role="group">
              <button
                aria-pressed={sourceInputMode === "archive"}
                className={sourceInputMode === "archive" ? "active" : ""}
                disabled={busy}
                onClick={() => {
                  setSourceInputMode("archive");
                  setFiles([]);
                }}
                type="button"
              >
                <FileArchive aria-hidden="true" size={16} />
                {t("dialog.sourceArchive")}
              </button>
              <button
                aria-pressed={sourceInputMode === "directory"}
                className={sourceInputMode === "directory" ? "active" : ""}
                disabled={busy}
                onClick={() => {
                  setSourceInputMode("directory");
                  setFiles([]);
                }}
                type="button"
              >
                <FolderOpen aria-hidden="true" size={16} />
                {t("dialog.sourceDirectory")}
              </button>
            </div>
            <label className="file-field">
              <span><Upload aria-hidden="true" size={16} />{t("dialog.sourceSelect")}</span>
              <input
                accept={sourceInputMode === "archive" ? ".zip,application/zip" : undefined}
                disabled={busy}
                key={sourceInputMode}
                multiple={sourceInputMode === "directory"}
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                ref={sourceInputRef}
                type="file"
              />
            </label>
            {files.length > 0 ? (
              <div className="source-selection" role="status">
                {sourceInputMode === "archive"
                  ? files[0].name
                  : t("dialog.sourceSelectionCount", { count: files.length })}
              </div>
            ) : null}
          </div>
        ) : null}
        {!result && busy && (action.requiresFile || action.sourceInput) ? (
          <div className="upload-progress" role="status">
            <div>
              <span>{t("dialog.uploadProgress")}</span>
              <strong>{progress}%</strong>
            </div>
            <progress aria-label={t("dialog.uploadProgress")} max={100} value={progress} />
          </div>
        ) : null}
        {!result && confirmationRequired ? (
          <label className="confirm-check">
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            {t("dialog.confirmRisk")}
          </label>
        ) : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {result ? (
          <footer>
            <button className="command-button" onClick={onClose} type="button">{t("dialog.close")}</button>
          </footer>
        ) : <footer>
          <button className="secondary-button" onClick={onClose} type="button">{t("dialog.cancel")}</button>
          <button
            className={action.dangerous ? "danger-button" : "command-button"}
            disabled={busy
              || optionsBusy
              || Boolean(confirmationRequired && !confirmed)
              || Boolean(action.requiresFile && !file)
              || Boolean(sourceInputRequired && files.length === 0)
              || hasMissingRequiredFields(body, action.requiredFields)
              || hasUnavailableOptions(body, fieldOptions)}
            type="submit"
          >
            {busy ? t("dialog.submitting") : t("dialog.confirm")}
          </button>
        </footer>}
      </form>
    </div>
  );
}

function Field({
  locale,
  name,
  onChange,
  options,
  value,
}: {
  locale: WebserverLocale;
  name: string;
  onChange(value: unknown): void;
  options?: readonly WebserverResourceFieldOptionValue[];
  value: unknown;
}) {
  if (typeof value === "boolean") {
    return (
      <label className="checkbox-field">
        <input checked={value} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span>{fieldLabel(name, locale)}</span>
      </label>
    );
  }
  if (options) {
    return (
      <label>
        <span>{fieldLabel(name, locale)}</span>
        <select
          disabled={options.length === 0}
          onChange={(event) => onChange(
            optionValue(options.find((option) => String(optionValue(option)) === event.target.value)
              ?? event.target.value),
          )}
          value={String(value ?? "")}
        >
          {options.length === 0 ? <option value="">-</option> : null}
          {options.map((option) => (
            <option key={String(optionValue(option))} value={String(optionValue(option))}>
              {optionLabel(option, name, locale)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label>
        <span>{fieldLabel(name, locale)}</span>
        <input onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} />
      </label>
    );
  }
  const multiline = name.toLowerCase().includes("content")
    || name.toLowerCase().includes("description");
  return (
    <label>
      <span>{fieldLabel(name, locale)}</span>
      {multiline ? (
        <textarea onChange={(event) => onChange(event.target.value)} value={String(value ?? "")} />
      ) : (
        <input
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          type={sensitive(name) ? "password" : "text"}
          value={String(value ?? "")}
        />
      )}
    </label>
  );
}

interface ScopeOption {
  id: string;
  label: string;
}

function scopeOption(
  item: Record<string, unknown>,
  scopeKind: "application" | "site",
): ScopeOption | undefined {
  const rawId = item.id
    ?? item[scopeKind === "application" ? "applicationId" : "siteId"];
  if (typeof rawId !== "string" && typeof rawId !== "number") return undefined;
  const id = String(rawId);
  const rawLabel = item.name ?? item.slug ?? item.hostname;
  const label = typeof rawLabel === "string" && rawLabel.trim()
    ? `${rawLabel.trim()} (${id})`
    : id;
  return { id, label };
}

function resourceText(
  t: (key: WebserverMessageKey) => string,
  resource: WebserverResourceKey,
  field: "label" | "description",
): string {
  return t(`resource.${resource}.${field}` as WebserverMessageKey);
}

function actionText(
  t: (key: WebserverMessageKey) => string,
  resource: WebserverResourceKey,
  action: WebserverResourceAction,
): string {
  const key = `action.${resource}.${action.id}` as WebserverMessageKey;
  try {
    return t(key);
  } catch {
    return action.label;
  }
}

function recordKey(item: Record<string, unknown>, index: number): string {
  return String(
    item.id
    ?? item.siteId
    ?? item.domainId
    ?? item.certificateId
    ?? item.deploymentId
    ?? item.configId
    ?? item.serverId
    ?? item.auditLogId
    ?? index,
  );
}

function displayValue(value: unknown, column: string, resource: WebserverResourceKey, locale: WebserverLocale): ReactNode {
  if (value === null || value === undefined) return "-";
  if ((resource === "sites" || resource === "applications") && column === "status") {
    return <span className={`status-badge application-status-${String(value).toLowerCase()}`}>{applicationStatus(value, locale)}</span>;
  }
  if (resource === "servers" && column === "status") {
    return <span className={`status-badge server-status-${String(value).toLowerCase()}`}>{serverStatus(value, locale)}</span>;
  }
  if ((resource === "deployments" || resource === "application-deployments") && column === "status") {
    const label = deploymentStatus(value, locale);
    return <span className={`status-badge deployment-status-${String(value).toLowerCase()}`}>{label}</span>;
  }
  if ((resource === "certificates" || resource === "managed-certificates") && column === "status") {
    return <span className={`status-badge certificate-status-${String(value).toLowerCase()}`}>{certificateStatus(value, locale)}</span>;
  }
  if ((resource === "certificates" || resource === "managed-certificates") && column === "renewalStatus") {
    return <span className={`status-badge renewal-status-${String(value).toLowerCase()}`}>{certificateRenewalStatus(value, locale)}</span>;
  }
  if (column === "artifactSize") return formatBytes(value);
  if (column === "durationMs") return formatDuration(value);
  if (column === "artifactHash" && typeof value === "string") {
    return <span title={value}>{value.length > 16 ? `${value.slice(0, 12)}...${value.slice(-4)}` : value}</span>;
  }
  if (column === "artifactDriveUri" && typeof value === "string") {
    const nodeId = value.split("/nodes/")[1];
    return <span title={value}>{nodeId ? `Drive / ${nodeId}` : value}</span>;
  }
  const codedLabel = codedValueLabel(column, value, locale);
  if (codedLabel) return codedLabel;
  if (typeof value === "boolean") return booleanLabel(value, locale);
  if (column.toLowerCase().includes("status")) {
    return <span className={`status-badge status-${String(value).toLowerCase()}`}>{String(value)}</span>;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function fieldLabel(value: string, locale: WebserverLocale): string {
  const labels: Record<WebserverLocale, Partial<Record<string, string>>> = {
    "en-US": {
      action: "Action",
      agentToken: "Node credential",
      applicationType: "Application type",
      artifactDriveUri: "Package",
      artifactHash: "Package hash",
      artifactSize: "Package size",
      autoRenew: "Automatic renewal",
      certName: "Certificate name",
      certType: "Certificate type",
      checkInterval: "Check interval (seconds)",
      checkType: "Check type",
      checkUrl: "Check URL",
      commitHash: "Commit hash",
      completedAt: "Completed at",
      configContent: "Configuration",
      configName: "Configuration name",
      configType: "Configuration type",
      createdAt: "Created at",
      deployedAt: "Deployed at",
      deployType: "Deployment method",
      description: "Description",
      domain: "Domain",
      domainId: "Domain",
      durationMs: "Duration",
      environment: "Environment",
      endDate: "End date",
      hostname: "Domain",
      host: "Host",
      id: "ID",
      isPrimary: "Primary domain",
      isActive: "Active",
      isSecret: "Secret value",
      isVerified: "Verification",
      issuer: "Issuer",
      key: "Variable name",
      name: "Application name",
      operatorId: "Operator ID",
      operatorType: "Operator type",
      notAfter: "Expires at",
      notBefore: "Valid from",
      renewalStatus: "Renewal status",
      retryCount: "Retry count",
      siteType: "Runtime type",
      sourceRef: "Source ref",
      sshPort: "SSH port",
      startDate: "Start date",
      serverName: "Server",
      sslEnabled: "HTTPS",
      sslProvider: "Certificate provider",
      startedAt: "Started at",
      status: "Status",
      timeoutMs: "Timeout (ms)",
      targetType: "Target type",
      targetUuid: "Target ID",
      tenantScopeHash: "Tenant scope hash",
      updatedAt: "Updated at",
      value: "Variable value",
      versionNo: "Version",
      versionTag: "Version",
      desiredSyncVersion: "Desired version",
      appliedSyncVersion: "Applied version",
      ipAddress: "IP address",
      lastHeartbeatAt: "Last heartbeat",
    },
    "zh-CN": {
      action: "操作动作",
      agentToken: "节点凭据",
      applicationType: "应用类型",
      artifactDriveUri: "发布包",
      artifactHash: "发布包哈希",
      artifactSize: "包大小",
      autoRenew: "自动续期",
      certName: "证书名称",
      certType: "证书类型",
      checkInterval: "检查间隔（秒）",
      checkType: "检查方式",
      checkUrl: "检查地址",
      commitHash: "提交哈希",
      completedAt: "完成时间",
      configContent: "配置内容",
      configName: "配置名称",
      configType: "配置类型",
      createdAt: "创建时间",
      deployedAt: "发布时间",
      deployType: "发布方式",
      description: "描述",
      domain: "域名",
      domainId: "域名",
      durationMs: "耗时",
      environment: "发布环境",
      endDate: "结束日期",
      hostname: "域名",
      host: "主机",
      id: "ID",
      isPrimary: "主域名",
      isActive: "已激活",
      isSecret: "敏感变量",
      isVerified: "验证状态",
      issuer: "签发机构",
      key: "变量名",
      name: "应用名称",
      operatorId: "操作人 ID",
      operatorType: "操作人类型",
      notAfter: "到期时间",
      notBefore: "生效时间",
      renewalStatus: "续期状态",
      retryCount: "重试次数",
      siteType: "运行类型",
      sourceRef: "源码分支",
      sshPort: "SSH 端口",
      startDate: "开始日期",
      serverName: "服务器",
      sslEnabled: "HTTPS",
      sslProvider: "证书来源",
      startedAt: "开始时间",
      status: "状态",
      timeoutMs: "超时时间（毫秒）",
      targetType: "目标类型",
      targetUuid: "目标 ID",
      tenantScopeHash: "租户范围哈希",
      updatedAt: "更新时间",
      value: "变量值",
      versionNo: "版本",
      versionTag: "版本号",
      desiredSyncVersion: "期望版本",
      appliedSyncVersion: "应用版本",
      ipAddress: "IP 地址",
      lastHeartbeatAt: "最后心跳",
    },
  };
  return labels[locale][value] ?? humanize(value);
}

function sensitive(value: string): boolean {
  return /secret|password|token|private|key/i.test(value);
}

function actionAvailable(
  action: WebserverResourceAction,
  selectedItem: Record<string, unknown> | undefined,
  scopeId: string,
): boolean {
  return action.availableWhen?.({ body: action.bodyTemplate, scopeId: scopeId || undefined, selectedItem })
    ?? true;
}

function optionValue(option: WebserverResourceFieldOptionValue): number | string {
  return typeof option === "object" ? option.value : option;
}

function optionLabel(option: WebserverResourceFieldOptionValue, name: string, locale: WebserverLocale): string {
  if (typeof option === "object") return option.label;
  return codedValueLabel(name, option, locale) ?? String(option);
}

function codedValueLabel(name: string, value: unknown, locale: WebserverLocale): string | undefined {
  const labels: Record<WebserverLocale, Partial<Record<string, string>>> = {
    "en-US": {
      "certType:1": "Let's Encrypt",
      "certType:2": "Custom certificate",
      "certType:3": "Self-signed certificate",
      "deployType:1": "Manual package",
      "deployType:2": "Git",
      "deployType:3": "CI/CD",
      "deployType:4": "API",
      "environment:development": "Development",
      "environment:production": "Production",
      "environment:staging": "Staging",
      "environment:test": "Test",
      "configType:1": "Global",
      "configType:2": "Site",
      "configType:3": "Domain",
      "configType:4": "Custom",
      "targetType:site": "Application",
      "targetType:domain": "Domain",
      "targetType:deployment": "Deployment",
      "targetType:certificate": "Certificate",
      "targetType:nginx_config": "Nginx configuration",
      "targetType:server": "Server",
    },
    "zh-CN": {
      "certType:1": "Let's Encrypt",
      "certType:2": "自定义证书",
      "certType:3": "自签名证书",
      "deployType:1": "手动上传",
      "deployType:2": "Git",
      "deployType:3": "CI/CD",
      "deployType:4": "API",
      "environment:development": "开发环境",
      "environment:production": "生产环境",
      "environment:staging": "预发布环境",
      "environment:test": "测试环境",
      "configType:1": "全局配置",
      "configType:2": "应用配置",
      "configType:3": "域名配置",
      "configType:4": "自定义配置",
      "targetType:site": "应用",
      "targetType:domain": "域名",
      "targetType:deployment": "发布",
      "targetType:certificate": "证书",
      "targetType:nginx_config": "Nginx 配置",
      "targetType:server": "服务器",
    },
  };
  return labels[locale][`${name}:${String(value)}`];
}

function booleanLabel(value: boolean, locale: WebserverLocale): string {
  return locale === "zh-CN" ? (value ? "是" : "否") : (value ? "Yes" : "No");
}

function certificateStatus(value: unknown, locale: WebserverLocale): string {
  const statuses: Record<WebserverLocale, Record<string, string>> = {
    "en-US": { "0": "Pending", "1": "Active", "2": "Expired", "3": "Revoked", "4": "Archived" },
    "zh-CN": { "0": "待签发", "1": "生效中", "2": "已过期", "3": "已吊销", "4": "已归档" },
  };
  return statuses[locale][String(value)] ?? String(value);
}

function certificateRenewalStatus(value: unknown, locale: WebserverLocale): string {
  const statuses: Record<WebserverLocale, Record<string, string>> = {
    "en-US": { "0": "Idle", "1": "Renewing", "2": "Pending", "3": "Failed" },
    "zh-CN": { "0": "无需续期", "1": "续期中", "2": "等待续期", "3": "续期失败" },
  };
  return statuses[locale][String(value)] ?? String(value);
}

function hasUnavailableOptions(
  body: Record<string, unknown>,
  fieldOptions: WebserverResourceFieldOptions,
): boolean {
  return Object.entries(fieldOptions).some(([name, options]) => name in body && options.length === 0);
}

function hasMissingRequiredFields(
  body: Record<string, unknown>,
  requiredFields: readonly string[] | undefined,
): boolean {
  return requiredFields?.some((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  }) ?? false;
}

function initialActionBody(
  action: WebserverResourceAction,
  selected: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(action.bodyTemplate).map(([field, fallback]) => [
      field,
      selected?.[field] !== undefined ? selected[field] : fallback,
    ]),
  );
}

function activeFilterCount(filters: Readonly<Record<string, string>>): number {
  return Object.values(filters).filter((value) => value.trim()).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resourceColumns(
  resource: WebserverResourceKey,
  items: readonly Record<string, unknown>[],
): string[] {
  const available = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  const preferred: Partial<Record<WebserverResourceKey, readonly string[]>> = {
    sites: ["id", "name", "applicationType", "siteType", "status", "updatedAt", "createdAt"],
    applications: ["id", "name", "applicationType", "siteType", "status", "updatedAt", "createdAt"],
    domains: ["id", "hostname", "isPrimary", "isVerified", "sslEnabled", "sslProvider", "status", "createdAt"],
    "application-domains": ["id", "hostname", "isPrimary", "isVerified", "sslEnabled", "sslProvider", "status", "createdAt"],
    certificates: ["id", "domain", "certName", "issuer", "status", "renewalStatus", "notAfter", "autoRenew"],
    "managed-certificates": ["id", "domain", "certName", "issuer", "status", "renewalStatus", "notAfter", "autoRenew"],
    "certificate-distribution": ["serverName", "host", "desiredSyncVersion", "appliedSyncVersion", "status", "lastHeartbeatAt"],
    deployments: ["id", "environment", "versionTag", "status", "artifactDriveUri", "artifactSize", "startedAt", "completedAt", "durationMs"],
    "application-deployments": ["id", "environment", "versionTag", "status", "artifactDriveUri", "artifactSize", "startedAt", "completedAt", "durationMs"],
    nginx: ["id", "configName", "configType", "isActive", "status", "versionNo", "deployedAt", "updatedAt"],
    servers: ["id", "name", "host", "sshPort", "status", "lastHeartbeatAt", "createdAt"],
    audit: ["operatorId", "operatorType", "action", "targetType", "targetUuid", "ipAddress", "createdAt"],
  };
  const ordered = [
    ...(preferred[resource] ?? []).filter((column) => available.includes(column)),
    ...available.filter((column) => !(preferred[resource] ?? []).includes(column)),
  ];
  return ordered.slice(0, resource === "deployments" || resource === "application-deployments" ? 9 : 8);
}

function applicationStatus(value: unknown, locale: WebserverLocale): string {
  const statuses: Record<WebserverLocale, Record<string, string>> = {
    "en-US": { "0": "Draft", "1": "Active", "2": "Disabled" },
    "zh-CN": { "0": "草稿", "1": "运行中", "2": "已停用" },
  };
  return statuses[locale][String(value)] ?? String(value);
}

function serverStatus(value: unknown, locale: WebserverLocale): string {
  const statuses: Record<WebserverLocale, Record<string, string>> = {
    "en-US": { "0": "Offline", "1": "Online" },
    "zh-CN": { "0": "离线", "1": "在线" },
  };
  return statuses[locale][String(value)] ?? String(value);
}

function deploymentStatus(value: unknown, locale: WebserverLocale): string {
  const statuses: Record<WebserverLocale, Record<string, string>> = {
    "en-US": {
      "0": "Pending",
      "1": "Deploying",
      "2": "Succeeded",
      "3": "Failed",
      "4": "Rolled back",
      "5": "Rollback source",
      "6": "Cancelled",
    },
    "zh-CN": {
      "0": "待处理",
      "1": "发布中",
      "2": "已成功",
      "3": "发布失败",
      "4": "已回滚",
      "5": "回滚源版本",
      "6": "已取消",
    },
  };
  return statuses[locale][String(value)] ?? String(value);
}

function formatBytes(value: unknown): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return String(value);
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = -1;
  do {
    amount /= 1024;
    unit += 1;
  } while (amount >= 1024 && unit < units.length - 1);
  return `${amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)} ${units[unit]}`;
}

function formatDuration(value: unknown): string {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return String(value);
  return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toFixed(1)} s`;
}
