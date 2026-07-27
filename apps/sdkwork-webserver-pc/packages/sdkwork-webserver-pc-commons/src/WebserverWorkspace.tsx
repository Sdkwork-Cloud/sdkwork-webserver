import { Activity, ChevronLeft, ChevronRight, LogOut, RefreshCw, Search, Settings2, Shield, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { translateWebserver, type WebserverLocale, type WebserverMessageKey } from "./i18n/index.ts";
import type { WebserverPageInfo, WebserverPcModuleDefinition, WebserverResourceAction, WebserverResourceDataSource, WebserverResourceKey, WebserverResourceRegistry } from "./types.ts";

export interface WebserverWorkspaceProps {
  locale: WebserverLocale;
  modules: readonly WebserverPcModuleDefinition[];
  onSignOut?(): void;
  permissionScope: readonly string[];
  registry: WebserverResourceRegistry;
  surface: "app-console" | "backend-admin";
  userLabel?: string;
}

export function WebserverWorkspace({ locale, modules, onSignOut, permissionScope, registry, surface, userLabel }: WebserverWorkspaceProps) {
  const location = useLocation();
  const t = (key: WebserverMessageKey, values?: Record<string, string | number>) => translateWebserver(locale, key, values);
  const entries = useMemo(
    () => modules.flatMap((module) => module.entries).filter((entry) => permissionScope.length === 0 || permissionScope.includes(entry.permission)).sort((a, b) => a.order - b.order),
    [modules, permissionScope],
  );
  const basePath = surface === "backend-admin" ? "/admin" : "/console";
  const current = entries.find((entry) => location.pathname.endsWith(`/${entry.resource}`)) ?? entries[0];
  if (!current) {
    return <main className="empty-access" role="alert"><Shield size={22} /><h1>{t("access.title")}</h1><p>{t("access.description")}</p></main>;
  }
  return <div className="app-layout">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">W</span><div><strong>{t("brand.name")}</strong><small>{t(`surface.${surface}`)}</small></div></div>
      <nav aria-label={t("nav.primary")}>{entries.map((entry) => <NavLink key={entry.resource} to={`${basePath}/${entry.resource}`}><Activity size={17} /><span>{resourceText(t, entry.resource, "label")}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><span title={userLabel}>{userLabel ?? t("auth.user")}</span>{onSignOut && <button className="icon-button" type="button" onClick={onSignOut} title={t("auth.signOut")}><LogOut size={17} /></button>}</div>
    </aside>
    <main className="workspace"><Routes><Route path="/:resource" element={<ResourcePage key={current.resource} entry={current} locale={locale} source={registry[current.resource]} />} /><Route path="*" element={<Navigate to={`${basePath}/${current.resource}`} replace />} /></Routes></main>
  </div>;
}

function ResourcePage({ entry, locale, source }: { entry: { resource: WebserverResourceKey }; locale: WebserverLocale; source?: WebserverResourceDataSource }) {
  const t = (key: WebserverMessageKey, values?: Record<string, string | number>) => translateWebserver(locale, key, values);
  const scopeKind = source?.scopeKind ?? "site";
  const scopeStorageKey = `sdkwork.webserver.${scopeKind}Id`;
  const [items, setItems] = useState<readonly Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<WebserverPageInfo>({ page: 1, pageSize: 20, hasMore: false });
  const [search, setSearch] = useState("");
  const [scopeId, setScopeId] = useState(() => sessionStorage.getItem(scopeStorageKey) ?? "");
  const [selected, setSelected] = useState<Record<string, unknown>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [action, setAction] = useState<WebserverResourceAction>();

  async function load(): Promise<void> {
    if (!source || (source.requiresScope && !scopeId.trim())) { setItems([]); return; }
    setBusy(true); setError(undefined);
    try {
      const result = await source.load({ page, pageSize: 20, scopeId: scopeId.trim() || undefined, search: search.trim() || undefined });
      setItems(result.items); setPageInfo(result.pageInfo);
    } catch { setError(t("error.operation")); } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [entry.resource, page, scopeId]);
  useEffect(() => { setPage(1); setSelected(undefined); }, [entry.resource]);
  const columns = useMemo(() => Array.from(new Set(items.flatMap((item) => Object.keys(item)))).slice(0, 7), [items]);
  const scopeLabel = t(scopeKind === "application" ? "toolbar.applicationId" : "toolbar.siteId");
  const persistScope = (value: string) => { setScopeId(value); if (value.trim()) sessionStorage.setItem(scopeStorageKey, value.trim()); else sessionStorage.removeItem(scopeStorageKey); };

  return <section className="resource-page">
    <header className="page-header"><div><span className="eyebrow">{entry.resource}</span><h1>{resourceText(t, entry.resource, "label")}</h1><p>{resourceText(t, entry.resource, "description")}</p></div><button className="icon-button" type="button" onClick={() => void load()} disabled={busy} title={t("toolbar.refresh")}><RefreshCw size={18} /></button></header>
    <div className="toolbar"><form className="search-box" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}><Search size={16} /><input aria-label={t("toolbar.search")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("toolbar.search")} /></form>{source?.requiresScope && <label className="scope-input"><Settings2 size={16} /><input aria-label={scopeLabel} value={scopeId} onChange={(event) => persistScope(event.target.value)} placeholder={scopeLabel} /></label>}<div className="actions">{source?.actions.map((candidate) => <button key={candidate.id} type="button" className={candidate.dangerous ? "danger-button" : "command-button"} disabled={busy || (candidate.requiresSelection && !selected) || (candidate.requiresScope && !scopeId.trim())} onClick={() => setAction(candidate)}>{actionText(t, entry.resource, candidate)}</button>)}</div></div>
    {error && <div className="error-banner" role="alert">{error}<button className="icon-button" onClick={() => setError(undefined)} title={t("toolbar.dismiss")}><X size={16} /></button></div>}
    {source?.requiresScope && !scopeId.trim() ? <div className="empty-state">{t(scopeKind === "application" ? "scope.application.empty" : "scope.site.empty")}</div> : <div className="table-frame" aria-busy={busy}><table><thead><tr><th aria-label={t("table.select")} />{columns.map((column) => <th key={column}>{humanize(column)}</th>)}</tr></thead><tbody>{items.map((item, index) => <tr key={recordKey(item, index)} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}><td><input type="radio" readOnly checked={selected === item} aria-label={t("table.selectRow", { row: index + 1 })} /></td>{columns.map((column) => <td key={column}>{displayValue(item[column], column)}</td>)}</tr>)}</tbody></table>{!busy && items.length === 0 && <div className="empty-state">{t("table.empty")}</div>}</div>}
    <footer className="pagination"><span>{pageInfo.total === undefined ? t("pagination.page", { page: pageInfo.page }) : t("pagination.total", { total: pageInfo.total })}</span><button className="icon-button" title={t("pagination.previous")} disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={18} /></button><button className="icon-button" title={t("pagination.next")} disabled={!pageInfo.hasMore || busy} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer>
    {action && <ActionDialog action={action} label={actionText(t, entry.resource, action)} locale={locale} scopeId={scopeId || undefined} selected={selected} onClose={() => setAction(undefined)} onComplete={() => { setAction(undefined); void load(); }} />}
  </section>;
}

function ActionDialog({ action, label, locale, onClose, onComplete, scopeId, selected }: { action: WebserverResourceAction; label: string; locale: WebserverLocale; onClose(): void; onComplete(): void; scopeId?: string; selected?: Record<string, unknown> }) {
  const t = (key: WebserverMessageKey) => translateWebserver(locale, key);
  const [body, setBody] = useState<Record<string, unknown>>(() => ({ ...action.bodyTemplate }));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.dangerous && !confirmed) return;
    setBusy(true); setError(undefined);
    try { await action.execute({ body, scopeId, selectedItem: selected }); onComplete(); }
    catch { setError(t("error.operation")); } finally { setBusy(false); }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="dialog" role="dialog" aria-modal="true" aria-labelledby="action-title" onSubmit={(event) => void submit(event)}><header><div><span className="eyebrow">{t("dialog.command")}</span><h2 id="action-title">{label}</h2></div><button className="icon-button" type="button" onClick={onClose} title={t("dialog.close")}><X size={18} /></button></header>{action.dangerous && <div className="warning">{t("dialog.warning")}</div>}<div className="form-grid">{Object.entries(body).map(([name, value]) => <Field key={name} name={name} options={action.fieldOptions?.[name]} value={value} onChange={(next) => setBody((current) => ({ ...current, [name]: next }))} />)}</div>{action.dangerous && <label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{t("dialog.confirmRisk")}</label>}{error && <div className="error-banner" role="alert">{error}</div>}<footer><button type="button" className="secondary-button" onClick={onClose}>{t("dialog.cancel")}</button><button type="submit" className={action.dangerous ? "danger-button" : "command-button"} disabled={busy || Boolean(action.dangerous && !confirmed)}>{busy ? t("dialog.submitting") : t("dialog.confirm")}</button></footer></form></div>;
}

function Field({ name, onChange, options, value }: { name: string; onChange(value: unknown): void; options?: readonly (number | string)[]; value: unknown }) {
  if (typeof value === "boolean") return <label className="checkbox-field"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span>{humanize(name)}</span></label>;
  if (options?.length) return <label><span>{humanize(name)}</span><select value={String(value ?? "")} onChange={(event) => onChange(options.find((option) => String(option) === event.target.value) ?? event.target.value)}>{options.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select></label>;
  if (typeof value === "number") return <label><span>{humanize(name)}</span><input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
  const multiline = name.toLowerCase().includes("content") || name.toLowerCase().includes("description");
  return <label><span>{humanize(name)}</span>{multiline ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /> : <input type={sensitive(name) ? "password" : "text"} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} autoComplete="off" />}</label>;
}

function resourceText(t: (key: WebserverMessageKey) => string, resource: WebserverResourceKey, field: "label" | "description"): string { return t(`resource.${resource}.${field}` as WebserverMessageKey); }
function actionText(t: (key: WebserverMessageKey) => string, resource: WebserverResourceKey, action: WebserverResourceAction): string { const key = `action.${resource}.${action.id}` as WebserverMessageKey; try { return t(key); } catch { return action.label; } }
function recordKey(item: Record<string, unknown>, index: number): string { return String(item.id ?? item.siteId ?? item.domainId ?? item.certificateId ?? item.deploymentId ?? item.configId ?? item.serverId ?? item.auditLogId ?? index); }
function displayValue(value: unknown, column: string): ReactNode { if (value === null || value === undefined) return "-"; if (column.toLowerCase().includes("status")) return <span className={`status-badge status-${String(value).toLowerCase()}`}>{String(value)}</span>; if (typeof value === "object") return JSON.stringify(value); return String(value); }
function humanize(value: string): string { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
function sensitive(value: string): boolean { return /secret|password|token|private|key/i.test(value); }
