import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Globe2,
  Inbox,
  Link2,
  ListTree,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useWebserverAdminSdk, type WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  formatWebserverErrorMessage,
  hasWebserverPermission,
  translateWebserver,
  type WebserverLocale,
} from "@sdkwork/webserver-pc-commons";

import { ApplicationPicker } from "./ApplicationPicker";
import { DomainCertificateManagementDialog } from "./DomainCertificateManagementDialog";
import { domainMessages, type DomainMessages } from "./i18n";
import "./root-domain-management.css";

type RootDomainPage = Awaited<ReturnType<WebserverAdminSdkClient["domain"]["rootDomains"]["list"]>>;
type RootDomain = RootDomainPage["items"][number];
type SubdomainPage = Awaited<ReturnType<WebserverAdminSdkClient["domain"]["rootDomains"]["subdomains"]["list"]>>;
type Subdomain = SubdomainPage["items"][number];

interface RootDomainManagementProps {
  locale: WebserverLocale;
  permissionScope: readonly string[];
}

interface Confirmation {
  confirmLabel?: string;
  detail: string;
  kind?: "delete" | "unlink";
  onConfirm(): Promise<void>;
  title: string;
}

const PAGE_SIZE = 20;

export function RootDomainManagement(props: RootDomainManagementProps) {
  return (
    <Routes>
      <Route index element={<RootDomainList {...props} />} />
      <Route path=":rootDomainId" element={<RootDomainDetail {...props} />} />
    </Routes>
  );
}

function RootDomainList({ locale, permissionScope }: RootDomainManagementProps) {
  const client = useWebserverAdminSdk();
  const navigate = useNavigate();
  const copy = domainMessages(locale);
  const canWrite = hasWebserverPermission(permissionScope, "web.sites.write");
  const [items, setItems] = useState<readonly RootDomain[]>([]);
  const [pageInfo, setPageInfo] = useState<RootDomainPage["pageInfo"]>();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setBusy(true);
    setError(undefined);
    try {
      const response = await client.domain.rootDomains.list({
        keyword: keyword || undefined,
        page,
        pageSize: PAGE_SIZE,
        status: status === "" ? undefined : Number(status),
      });
      if (sequence === loadSequence.current) {
        setItems(response.items);
        setPageInfo(response.pageInfo);
      }
    } catch (cause) {
      if (sequence === loadSequence.current) {
        setError(errorMessage(cause, locale));
      }
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [client, keyword, locale, page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = countValue(pageInfo?.totalItems);
  const hasNext = pageInfo?.hasMore ?? (total !== undefined && page * PAGE_SIZE < total);

  async function createRootDomain(hostname: string): Promise<void> {
    await client.domain.rootDomains.create(
      { hostname: normalizeHostname(hostname) },
      { idempotencyKey: idempotencyKey("root-domain-create") },
    );
    setCreateOpen(false);
    if (page === 1) await load();
    else setPage(1);
  }

  function requestDelete(item: RootDomain): void {
    setConfirmation({
      detail: copy.deleteZoneDetail.replace("{hostname}", item.hostname),
      title: copy.deleteZone,
      async onConfirm() {
        await client.domain.rootDomains.delete(item.id, {
          idempotencyKey: idempotencyKey("root-domain-delete"),
        });
        setConfirmation(undefined);
        if (page > 1 && items.length === 1) setPage((current) => current - 1);
        else await load();
      },
    });
  }

  return (
    <section aria-label={copy.title} className="resource-page root-domain-workspace">
      <div className="resource-commandbar root-domain-commandbar">
        <div className="resource-identity"><h1>{copy.title}</h1></div>
        <div className="resource-query">
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setKeyword(search.trim().toLowerCase());
            }}
            role="search"
          >
            <Search aria-hidden="true" size={16} />
            <input
              aria-label={copy.search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              value={search}
            />
          </form>
          <label className="root-domain-status-filter">
            <span className="sr-only">{copy.status}</span>
            <select
              aria-label={copy.status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              value={status}
            >
              <option value="">{copy.allStatuses}</option>
              <option value="1">{copy.active}</option>
              <option value="0">{copy.pending}</option>
              <option value="2">{copy.disabled}</option>
            </select>
          </label>
        </div>
        <div className="actions">
          {canWrite ? (
            <button className="command-button" onClick={() => setCreateOpen(true)} type="button">
              <Plus aria-hidden="true" size={16} />
              {copy.addRootDomain}
            </button>
          ) : null}
          <IconButton busy={busy} label={copy.refresh} onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className={busy ? "is-spinning" : undefined} size={17} />
          </IconButton>
        </div>
      </div>

      {error ? <InlineError closeLabel={copy.close} message={error} onDismiss={() => setError(undefined)} /> : null}
      <div className="data-surface root-domain-data-surface">
        <div aria-busy={busy} className="table-frame">
          {busy && items.length === 0 ? <LoadingState label={copy.loading} /> : null}
          {!busy && items.length === 0 ? <EmptyState label={copy.noRootDomains} /> : null}
          {items.length > 0 ? (
            <table className="root-domain-table">
              <thead>
                <tr>
                  <th>{copy.rootDomain}</th>
                  <th>{copy.status}</th>
                  <th>{copy.hostnames}</th>
                  <th>{copy.boundApplications}</th>
                  <th>{copy.verified}</th>
                  <th>{copy.https}</th>
                  <th>{copy.activeDeployments}</th>
                  <th>{copy.updatedAt}</th>
                  <th className="root-domain-actions-column">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/admin/root-domains/${item.id}`)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/root-domains/${item.id}`);
                      }
                    }}
                  >
                    <td>
                      <span className="root-domain-name">
                        <Globe2 aria-hidden="true" size={17} />
                        <strong>{item.hostname}</strong>
                      </span>
                    </td>
                    <td><StatusMark label={rootDomainStatus(item.status, copy)} tone={item.status === 1 ? "success" : item.status === 2 ? "muted" : "warning"} /></td>
                    <td>{item.subdomainCount}</td>
                    <td>{item.boundSubdomainCount}</td>
                    <td>{item.verifiedSubdomainCount}</td>
                    <td>{item.httpsSubdomainCount}</td>
                    <td>{item.activeDeploymentCount}</td>
                    <td>{formatDate(item.updatedAt, locale)}</td>
                    <td className="root-domain-row-actions">
                      <div
                        className="root-domain-operation-buttons"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <IconAction
                          label={copy.manageHostnames}
                          onClick={() => navigate(`/admin/root-domains/${item.id}`)}
                        >
                          <ListTree aria-hidden="true" size={15} />
                        </IconAction>
                        {canWrite ? (
                          <IconAction
                            label={copy.quickAddHostname}
                            onClick={() => navigate(`/admin/root-domains/${item.id}?action=create-hostname`)}
                          >
                            <Plus aria-hidden="true" size={15} />
                          </IconAction>
                        ) : null}
                        {canWrite ? (
                          <IconAction
                            danger
                            disabled={countValue(item.subdomainCount) !== 0}
                            label={copy.deleteZone}
                            onClick={() => requestDelete(item)}
                            tooltip={countValue(item.subdomainCount) === 0 ? copy.deleteZone : copy.deleteZoneBlocked}
                          >
                            <Trash2 aria-hidden="true" size={15} />
                          </IconAction>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <Pagination
          hasNext={hasNext}
          label={total === undefined ? copy.page.replace("{page}", String(page)) : copy.total.replace("{total}", String(total))}
          onNext={() => setPage((current) => current + 1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          page={page}
          busy={busy}
          copy={copy}
        />
      </div>

      {createOpen ? (
        <CreateRootDomainDialog
          copy={copy}
          locale={locale}
          onClose={() => setCreateOpen(false)}
          onSubmit={createRootDomain}
        />
      ) : null}
      {confirmation ? (
        <ConfirmDialog
          confirmation={confirmation}
          copy={copy}
          locale={locale}
          onClose={() => setConfirmation(undefined)}
        />
      ) : null}
    </section>
  );
}

function RootDomainDetail({ locale, permissionScope }: RootDomainManagementProps) {
  const { rootDomainId = "" } = useParams<{ rootDomainId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useWebserverAdminSdk();
  const navigate = useNavigate();
  const copy = domainMessages(locale);
  const canWrite = hasWebserverPermission(permissionScope, "web.sites.write");
  const canWriteCertificates = hasWebserverPermission(permissionScope, "web.certificates.write");
  const canReadCertificates = canWriteCertificates
    || hasWebserverPermission(permissionScope, "web.certificates.read");
  const [rootDomain, setRootDomain] = useState<RootDomain>();
  const [items, setItems] = useState<readonly Subdomain[]>([]);
  const [pageInfo, setPageInfo] = useState<SubdomainPage["pageInfo"]>();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [binding, setBinding] = useState<Subdomain>();
  const [certificateDomain, setCertificateDomain] = useState<Subdomain>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    if (!rootDomainId) return;
    const sequence = ++loadSequence.current;
    setBusy(true);
    setError(undefined);
    try {
      const [zone, subdomains] = await Promise.all([
        client.domain.rootDomains.retrieve(rootDomainId),
        client.domain.rootDomains.subdomains.list(rootDomainId, { page, pageSize: PAGE_SIZE }),
      ]);
      if (sequence === loadSequence.current) {
        setRootDomain(zone);
        setItems(subdomains.items);
        setPageInfo(subdomains.pageInfo);
      }
    } catch (cause) {
      if (sequence === loadSequence.current) {
        setError(errorMessage(cause, locale));
      }
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [client, locale, page, rootDomainId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canWrite || !rootDomain || searchParams.get("action") !== "create-hostname") return;
    setCreateOpen(true);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("action");
    setSearchParams(nextSearchParams, { replace: true });
  }, [canWrite, rootDomain, searchParams, setSearchParams]);

  const total = countValue(pageInfo?.totalItems);
  const hasNext = pageInfo?.hasMore ?? (total !== undefined && page * PAGE_SIZE < total);

  async function runAction(action: string, id: string, operation: () => Promise<unknown>): Promise<void> {
    setActionBusy(`${action}:${id}`);
    setError(undefined);
    try {
      await operation();
      await load();
    } catch (cause) {
      setError(errorMessage(cause, locale));
    } finally {
      setActionBusy(undefined);
    }
  }

  async function createHostname(form: HostnameForm): Promise<void> {
    const applicationId = form.applicationId || undefined;
    await client.domain.rootDomains.subdomains.create(
      rootDomainId,
      {
        applicationId,
        isPrimary: applicationId ? form.isPrimary : false,
        recordName: normalizeRecordName(form.recordName),
        sslEnabled: form.sslEnabled,
        sslProvider: form.sslEnabled ? form.sslProvider : "none",
      },
      { idempotencyKey: idempotencyKey("root-domain-hostname-create") },
    );
    setCreateOpen(false);
    if (page === 1) await load();
    else setPage(1);
  }

  async function bindApplication(applicationId: string, isPrimary: boolean): Promise<void> {
    if (!binding) return;
    const domain = binding;
    setBinding(undefined);
    await runAction("bind", domain.id, () => client.domain.applicationBinding.update(
      domain.id,
      { applicationId, isPrimary },
      { idempotencyKey: idempotencyKey("domain-bind") },
    ));
  }

  function requestUnbind(domain: Subdomain): void {
    setConfirmation({
      confirmLabel: copy.confirmUnbind,
      detail: copy.unbindApplicationDetail.replace("{hostname}", domain.hostname),
      kind: "unlink",
      title: copy.unbindApplication,
      async onConfirm() {
        await client.domain.applicationBinding.delete(domain.id, {
          idempotencyKey: idempotencyKey("domain-unbind"),
        });
        setConfirmation(undefined);
        await load();
      },
    });
  }

  function requestZoneDelete(): void {
    if (!rootDomain) return;
    setConfirmation({
      detail: copy.deleteZoneDetail.replace("{hostname}", rootDomain.hostname),
      title: copy.deleteZone,
      async onConfirm() {
        await client.domain.rootDomains.delete(rootDomain.id, {
          idempotencyKey: idempotencyKey("root-domain-delete"),
        });
        navigate("/admin/root-domains");
      },
    });
  }

  function requestHostnameDelete(domain: Subdomain): void {
    setConfirmation({
      detail: copy.deleteHostnameDetail.replace("{hostname}", domain.hostname),
      title: copy.deleteHostname,
      async onConfirm() {
        await client.domain.delete(domain.id, {
          idempotencyKey: idempotencyKey("domain-delete"),
        });
        setConfirmation(undefined);
        if (page > 1 && items.length === 1) setPage((current) => current - 1);
        else await load();
      },
    });
  }

  return (
    <section aria-label={rootDomain?.hostname ?? copy.title} className="resource-page root-domain-workspace root-domain-detail">
      <div className="root-domain-breadcrumb">
        <button onClick={() => navigate("/admin/root-domains")} type="button">{copy.title}</button>
        <ChevronRight aria-hidden="true" size={14} />
        <span>{rootDomain?.hostname ?? copy.loading}</span>
      </div>
      <div className="resource-commandbar root-domain-commandbar">
        <div className="resource-identity root-domain-detail-identity">
          <Globe2 aria-hidden="true" size={18} />
          <h1>{rootDomain?.hostname ?? copy.loading}</h1>
          {rootDomain ? <StatusMark label={rootDomainStatus(rootDomain.status, copy)} tone={rootDomain.status === 1 ? "success" : "warning"} /> : null}
        </div>
        <div className="actions">
          {canWrite ? (
            <button className="command-button" onClick={() => setCreateOpen(true)} type="button">
              <Plus aria-hidden="true" size={16} />
              {copy.addHostname}
            </button>
          ) : null}
          {canWrite && rootDomain ? (
            <button
              aria-label={copy.deleteZone}
              className="danger-button"
              disabled={countValue(rootDomain.subdomainCount) !== 0}
              onClick={requestZoneDelete}
              title={countValue(rootDomain.subdomainCount) === 0 ? copy.deleteZone : copy.deleteZoneBlocked}
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} />
              <span className="delete-zone-label">{copy.deleteZone}</span>
            </button>
          ) : null}
          <IconButton busy={busy} label={copy.refresh} onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className={busy ? "is-spinning" : undefined} size={17} />
          </IconButton>
        </div>
      </div>

      {rootDomain ? (
        <div className="root-domain-stat-band">
          <DomainStat label={copy.hostnames} value={rootDomain.subdomainCount} />
          <DomainStat label={copy.boundApplications} value={rootDomain.boundSubdomainCount} />
          <DomainStat label={copy.verified} value={rootDomain.verifiedSubdomainCount} />
          <DomainStat label={copy.https} value={rootDomain.httpsSubdomainCount} />
          <DomainStat label={copy.activeDeployments} value={rootDomain.activeDeploymentCount} />
        </div>
      ) : null}

      {error ? <InlineError closeLabel={copy.close} message={error} onDismiss={() => setError(undefined)} /> : null}
      <div className="data-surface root-domain-data-surface root-domain-hostname-surface">
        <div aria-busy={busy} className="table-frame">
          {busy && items.length === 0 ? <LoadingState label={copy.loading} /> : null}
          {!busy && items.length === 0 ? <EmptyState label={copy.noHostnames} /> : null}
          {items.length > 0 ? (
            <table className="root-domain-hostname-table">
              <thead>
                <tr>
                  <th>{copy.recordName}</th>
                  <th>{copy.hostname}</th>
                  <th>{copy.application}</th>
                  <th>{copy.latestDeployment}</th>
                  <th>{copy.verification}</th>
                  <th>{copy.https}</th>
                  <th>{copy.updatedAt}</th>
                  <th className="hostname-actions-column">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((domain) => (
                  <tr key={domain.id}>
                    <td><strong className="record-name">{domain.recordName ?? "@"}</strong>{domain.isPrimary ? <span className="primary-mark">{copy.primary}</span> : null}</td>
                    <td><a className="hostname-link" href={`${domain.sslEnabled ? "https" : "http"}://${domain.hostname}`} rel="noreferrer" target="_blank">{domain.hostname}<ExternalLink aria-hidden="true" size={13} /></a></td>
                    <td>{domain.applicationName ? <span className="application-binding"><Link2 aria-hidden="true" size={14} />{domain.applicationName}</span> : <span className="muted-value">{copy.unbound}</span>}</td>
                    <td><DeploymentCell deployment={domain.latestDeployment} locale={locale} copy={copy} /></td>
                    <td><StatusMark label={domain.isVerified ? copy.verified : copy.unverified} tone={domain.isVerified ? "success" : "warning"} /></td>
                    <td><HttpsCell domain={domain} copy={copy} /></td>
                    <td>{formatDate(domain.updatedAt ?? domain.createdAt, locale)}</td>
                    <td className="hostname-actions-cell">
                      <div className="hostname-row-actions">
                        {canWrite ? (
                          <IconAction
                            busy={actionBusy === `verify:${domain.id}`}
                            disabled={Boolean(actionBusy) || domain.isVerified}
                            label={copy.verify}
                            onClick={() => void runAction("verify", domain.id, () => client.domain.verify(domain.id, { idempotencyKey: idempotencyKey("domain-verify") }))}
                          ><BadgeCheck aria-hidden="true" size={15} /></IconAction>
                        ) : null}
                        {canWrite && !domain.applicationId ? (
                          <IconAction disabled={Boolean(actionBusy)} label={copy.bindApplication} onClick={() => setBinding(domain)}><Link2 aria-hidden="true" size={15} /></IconAction>
                        ) : null}
                        {canWrite && domain.applicationId ? (
                          <IconAction
                            disabled={Boolean(actionBusy)}
                            label={copy.unbindApplication}
                            onClick={() => requestUnbind(domain)}
                          ><Unlink aria-hidden="true" size={15} /></IconAction>
                        ) : null}
                        {canReadCertificates ? (
                          <IconAction
                            disabled={Boolean(actionBusy)}
                            label={copy.manageCertificates}
                            onClick={() => setCertificateDomain(domain)}
                          ><ShieldCheck aria-hidden="true" size={15} /></IconAction>
                        ) : null}
                        {canWrite ? (
                          <IconAction
                            danger
                            disabled={Boolean(actionBusy) || Boolean(domain.applicationId) || Number(domain.certificateCount) > 0}
                            label={copy.deleteHostname}
                            onClick={() => requestHostnameDelete(domain)}
                          ><Trash2 aria-hidden="true" size={15} /></IconAction>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <Pagination
          hasNext={hasNext}
          label={total === undefined ? copy.page.replace("{page}", String(page)) : copy.total.replace("{total}", String(total))}
          onNext={() => setPage((current) => current + 1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          page={page}
          busy={busy}
          copy={copy}
        />
      </div>

      {createOpen && rootDomain ? (
        <CreateHostnameDialog
          client={client}
          copy={copy}
          hostname={rootDomain.hostname}
          locale={locale}
          onClose={() => setCreateOpen(false)}
          onSubmit={createHostname}
        />
      ) : null}
      {binding ? (
        <BindApplicationDialog
          client={client}
          copy={copy}
          domain={binding}
          locale={locale}
          onClose={() => setBinding(undefined)}
          onSubmit={bindApplication}
        />
      ) : null}
      {certificateDomain ? (
        <DomainCertificateManagementDialog
          canWrite={canWriteCertificates}
          client={client}
          copy={copy}
          domain={{
            applicationId: certificateDomain.applicationId,
            hostname: certificateDomain.hostname,
            id: certificateDomain.id,
            isVerified: certificateDomain.isVerified,
          }}
          locale={locale}
          onChanged={() => void load()}
          onClose={() => setCertificateDomain(undefined)}
        />
      ) : null}
      {confirmation ? (
        <ConfirmDialog confirmation={confirmation} copy={copy} locale={locale} onClose={() => setConfirmation(undefined)} />
      ) : null}
    </section>
  );
}

interface HostnameForm {
  applicationId: string;
  isPrimary: boolean;
  recordName: string;
  sslEnabled: boolean;
  sslProvider: "custom" | "letsencrypt" | "none";
}

function CreateRootDomainDialog({ copy, locale, onClose, onSubmit }: {
  copy: DomainMessages;
  locale: WebserverLocale;
  onClose(): void;
  onSubmit(hostname: string): Promise<void>;
}) {
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(hostname);
    } catch (cause) {
      setError(errorMessage(cause, locale));
      setBusy(false);
    }
  }
  return (
    <Dialog copy={copy} onClose={onClose} title={copy.addRootDomain}>
      <form onSubmit={(event) => void submit(event)}>
        <label className="domain-form-field">
          <span>{copy.rootDomain}</span>
          <input autoFocus onChange={(event) => setHostname(event.target.value)} placeholder="example.com" required value={hostname} />
        </label>
        {error ? <p className="domain-dialog-error" role="alert">{error}</p> : null}
        <DialogFooter busy={busy} copy={copy} onClose={onClose} submitLabel={copy.confirmAdd} />
      </form>
    </Dialog>
  );
}

function CreateHostnameDialog({ client, copy, hostname, locale, onClose, onSubmit }: {
  client: WebserverAdminSdkClient;
  copy: DomainMessages;
  hostname: string;
  locale: WebserverLocale;
  onClose(): void;
  onSubmit(form: HostnameForm): Promise<void>;
}) {
  const [form, setForm] = useState<HostnameForm>({
    applicationId: "",
    isPrimary: false,
    recordName: "",
    sslEnabled: true,
    sslProvider: "letsencrypt",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(form);
    } catch (cause) {
      setError(errorMessage(cause, locale));
      setBusy(false);
    }
  }
  return (
    <Dialog copy={copy} onClose={onClose} title={copy.addHostname}>
      <form onSubmit={(event) => void submit(event)}>
        <label className="domain-form-field">
          <span>{copy.recordName}</span>
          <div className="hostname-composer">
            <input autoFocus onChange={(event) => setForm((current) => ({ ...current, recordName: event.target.value }))} placeholder="@ / www / api" required value={form.recordName} />
            <span>.{hostname}</span>
          </div>
        </label>
        <div className="domain-form-field">
          <span>{copy.application}</span>
          <ApplicationPicker
            allowUnbound
            client={client}
            copy={copy}
            locale={locale}
            onChange={(applicationId) => setForm((current) => ({
              ...current,
              applicationId,
              isPrimary: applicationId ? current.isPrimary : false,
            }))}
            value={form.applicationId}
          />
        </div>
        <div className="domain-toggle-list">
          <label><input checked={form.sslEnabled} onChange={(event) => setForm((current) => ({ ...current, sslEnabled: event.target.checked }))} type="checkbox" /><span>{copy.enableHttps}</span></label>
          <label><input checked={form.isPrimary} disabled={!form.applicationId} onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))} type="checkbox" /><span>{copy.primaryHostname}</span></label>
        </div>
        {form.sslEnabled ? (
          <label className="domain-form-field">
            <span>{copy.certificateProvider}</span>
            <select onChange={(event) => setForm((current) => ({ ...current, sslProvider: event.target.value as HostnameForm["sslProvider"] }))} value={form.sslProvider}>
              <option value="letsencrypt">Let's Encrypt</option>
              <option value="custom">{copy.customCertificate}</option>
              <option value="none">{copy.noCertificate}</option>
            </select>
          </label>
        ) : null}
        {error ? <p className="domain-dialog-error" role="alert">{error}</p> : null}
        <DialogFooter busy={busy} copy={copy} onClose={onClose} submitLabel={copy.confirmAdd} />
      </form>
    </Dialog>
  );
}

function BindApplicationDialog({ client, copy, domain, locale, onClose, onSubmit }: {
  client: WebserverAdminSdkClient;
  copy: DomainMessages;
  domain: Subdomain;
  locale: WebserverLocale;
  onClose(): void;
  onSubmit(applicationId: string, isPrimary: boolean): Promise<void>;
}) {
  const [applicationId, setApplicationId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(applicationId, isPrimary);
    } catch (cause) {
      setError(errorMessage(cause, locale));
      setBusy(false);
    }
  }
  return (
    <Dialog copy={copy} onClose={onClose} title={copy.bindApplication}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="dialog-target-hostname">{domain.hostname}</div>
        <div className="domain-form-field">
          <span>{copy.application}</span>
          <ApplicationPicker
            client={client}
            copy={copy}
            locale={locale}
            onChange={setApplicationId}
            value={applicationId}
          />
        </div>
        <div className="domain-toggle-list"><label><input checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} type="checkbox" /><span>{copy.primaryHostname}</span></label></div>
        {error ? <p className="domain-dialog-error" role="alert">{error}</p> : null}
        <DialogFooter busy={busy} copy={copy} disabled={!applicationId} onClose={onClose} submitLabel={copy.confirmBind} />
      </form>
    </Dialog>
  );
}

function ConfirmDialog({ confirmation, copy, locale, onClose }: {
  confirmation: Confirmation;
  copy: DomainMessages;
  locale: WebserverLocale;
  onClose(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog copy={copy} onClose={onClose} title={confirmation.title}>
      <div className="domain-confirmation">
        <CircleAlert aria-hidden="true" size={20} />
        <p>{confirmation.detail}</p>
      </div>
      {error ? <p className="domain-dialog-error" role="alert">{error}</p> : null}
      <footer className="domain-dialog-footer">
        <button className="secondary-button" disabled={busy} onClick={onClose} type="button">{copy.cancel}</button>
        <button
          className="danger-button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            void confirmation.onConfirm().catch((cause) => {
              setError(errorMessage(cause, locale));
              setBusy(false);
            });
          }}
          type="button"
        >
          {busy ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : confirmation.kind === "unlink" ? <Unlink aria-hidden="true" size={15} /> : <Trash2 aria-hidden="true" size={15} />}
          {confirmation.confirmLabel ?? copy.confirmDelete}
        </button>
      </footer>
    </Dialog>
  );
}

function Dialog({ children, copy, onClose, title }: {
  children: ReactNode;
  copy: DomainMessages;
  onClose(): void;
  title: string;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop root-domain-dialog-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }} role="presentation">
      <div aria-label={title} aria-modal="true" className="dialog root-domain-dialog" role="dialog">
        <header>
          <h2>{title}</h2>
          <button aria-label={copy.close} className="icon-button" onClick={onClose} title={copy.close} type="button"><X aria-hidden="true" size={17} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function DialogFooter({ busy, copy, disabled = false, onClose, submitLabel }: {
  busy: boolean;
  copy: DomainMessages;
  disabled?: boolean;
  onClose(): void;
  submitLabel: string;
}) {
  return (
    <footer className="domain-dialog-footer">
      <button className="secondary-button" disabled={busy} onClick={onClose} type="button">{copy.cancel}</button>
      <button className="command-button" disabled={busy || disabled} type="submit">
        {busy ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : null}
        {submitLabel}
      </button>
    </footer>
  );
}

function Pagination({ busy, copy, hasNext, label, onNext, onPrevious, page }: {
  busy: boolean;
  copy: DomainMessages;
  hasNext: boolean;
  label: string;
  onNext(): void;
  onPrevious(): void;
  page: number;
}) {
  return (
    <footer className="pagination">
      <span>{label}</span>
      <IconButton busy={busy || page <= 1} label={copy.previous} onClick={onPrevious}><ChevronLeft aria-hidden="true" size={18} /></IconButton>
      <IconButton busy={busy || !hasNext} label={copy.next} onClick={onNext}><ChevronRight aria-hidden="true" size={18} /></IconButton>
    </footer>
  );
}

function IconButton({ busy, children, label, onClick }: {
  busy: boolean;
  children: ReactNode;
  label: string;
  onClick(): void;
}) {
  return <button aria-label={label} className="icon-button refresh-button" disabled={busy} onClick={onClick} title={label} type="button">{children}</button>;
}

function IconAction({ busy = false, children, danger = false, disabled = false, label, onClick, tooltip }: {
  busy?: boolean;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick(): void;
  tooltip?: string;
}) {
  return (
    <button
      aria-label={label}
      className={`row-action-button${danger ? " row-action-button-danger" : ""}`}
      disabled={busy || disabled}
      onClick={onClick}
      title={tooltip ?? label}
      type="button"
    >
      {busy ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : children}
    </button>
  );
}

function DomainStat({ label, value }: { label: string; value: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function DeploymentCell({ copy, deployment, locale }: {
  copy: DomainMessages;
  deployment: Subdomain["latestDeployment"];
  locale: WebserverLocale;
}) {
  if (!deployment) return <span className="muted-value">{copy.noDeployment}</span>;
  return (
    <div className="deployment-cell">
      <span><Rocket aria-hidden="true" size={14} /><StatusMark label={deploymentStatus(deployment.status, copy)} tone={deployment.status === 2 ? "success" : deployment.status === 3 ? "danger" : "warning"} /></span>
      <small>{deployment.versionTag || deployment.environment} · {formatDate(deployment.completedAt ?? deployment.createdAt, locale)}</small>
    </div>
  );
}

function HttpsCell({ copy, domain }: { copy: DomainMessages; domain: Subdomain }) {
  if (!domain.sslEnabled) return <span className="muted-value"><LockKeyhole aria-hidden="true" size={14} />{copy.off}</span>;
  if (Number(domain.certificateCount) === 0) {
    return <span className="https-cell https-cell-pending"><LockKeyhole aria-hidden="true" size={14} />{copy.certificatePending}</span>;
  }
  return (
    <span className="https-cell">
      <ShieldCheck aria-hidden="true" size={14} />
      {Number(domain.certificateCount) > 0 ? copy.certificateCount.replace("{count}", domain.certificateCount) : copy.enabled}
    </span>
  );
}

function StatusMark({ label, tone }: { label: string; tone: "danger" | "muted" | "success" | "warning" }) {
  return <span className={`domain-status domain-status-${tone}`}><i aria-hidden="true" />{label}</span>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="empty-state" role="status"><LoaderCircle aria-hidden="true" className="is-spinning" size={20} /><span>{label}</span></div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state"><Inbox aria-hidden="true" size={20} /><span>{label}</span></div>;
}

function InlineError({ closeLabel, message, onDismiss }: { closeLabel: string; message: string; onDismiss(): void }) {
  return <div className="error-banner" role="alert"><span>{message}</span><button aria-label={closeLabel} className="icon-button" onClick={onDismiss} type="button"><X aria-hidden="true" size={16} /></button></div>;
}

function idempotencyKey(action: string): string {
  return `${action}:${crypto.randomUUID()}`;
}

function normalizeHostname(value: string): string {
  const hostname = value.trim().toLowerCase();
  if (!isDnsName(hostname) || !hostname.includes(".")) throw new Error("Invalid root domain");
  return hostname;
}

function normalizeRecordName(value: string): string {
  const recordName = value.trim().toLowerCase();
  if (recordName === "@") return recordName;
  if (!isDnsName(recordName)) throw new Error("Invalid hostname record");
  return recordName;
}

function isDnsName(value: string): boolean {
  return Boolean(value)
    && value.length <= 253
    && !value.startsWith(".")
    && !value.endsWith(".")
    && value.split(".").every((label) => (
      label.length > 0
      && label.length <= 63
      && !label.startsWith("-")
      && !label.endsWith("-")
      && /^[a-z0-9-]+$/.test(label)
    ));
}

function countValue(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatDate(value: string | undefined, locale: WebserverLocale): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function errorMessage(cause: unknown, locale: WebserverLocale): string {
  return formatWebserverErrorMessage(cause, (key, values) => translateWebserver(locale, key, values));
}

function rootDomainStatus(status: number, copy: DomainMessages): string {
  if (status === 1) return copy.active;
  if (status === 2) return copy.disabled;
  return copy.pending;
}

function deploymentStatus(status: number, copy: DomainMessages): string {
  const labels = [copy.deploymentPending, copy.deploying, copy.deploymentSucceeded, copy.deploymentFailed, copy.rolledBack, copy.rollbackSource, copy.cancelled];
  return labels[status] ?? String(status);
}
