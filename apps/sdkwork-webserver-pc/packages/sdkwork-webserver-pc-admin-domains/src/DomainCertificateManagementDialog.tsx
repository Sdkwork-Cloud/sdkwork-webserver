import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";
import {
  formatWebserverErrorMessage,
  translateWebserver,
  type WebserverLocale,
} from "@sdkwork/webserver-pc-commons";

import type { DomainMessages } from "./i18n";

type CertificatePage = Awaited<ReturnType<WebserverAdminSdkClient["certificate"]["list"]>>;
type Certificate = CertificatePage["items"][number];
type BindingPage = Awaited<ReturnType<WebserverAdminSdkClient["certificate"]["applications"]["domains"]["listenerCertificateBindings"]["list"]>>;
type Binding = BindingPage["items"][number];

interface DomainCertificateManagementDialogProps {
  canWrite: boolean;
  client: WebserverAdminSdkClient;
  copy: DomainMessages;
  domain: {
    applicationId?: string;
    hostname: string;
    id: string;
    isVerified: boolean;
  };
  locale: WebserverLocale;
  onChanged(): void;
  onClose(): void;
}

const PAGE_SIZE = 10;

export function DomainCertificateManagementDialog({
  canWrite,
  client,
  copy,
  domain,
  locale,
  onChanged,
  onClose,
}: DomainCertificateManagementDialogProps) {
  const applicationId = domain.applicationId?.trim();
  const [bindings, setBindings] = useState<readonly Binding[]>([]);
  const [bindingPageInfo, setBindingPageInfo] = useState<BindingPage["pageInfo"]>();
  const [bindingPage, setBindingPage] = useState(1);
  const [certificates, setCertificates] = useState<readonly Certificate[]>([]);
  const [certificatePageInfo, setCertificatePageInfo] = useState<CertificatePage["pageInfo"]>();
  const [certificatePage, setCertificatePage] = useState(1);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [priority, setPriority] = useState(100);
  const [isDefault, setIsDefault] = useState(false);
  const [keyAlgorithm, setKeyAlgorithm] = useState<"ECDSA" | "RSA">("ECDSA");
  const [bindingBusy, setBindingBusy] = useState(false);
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [actionError, setActionError] = useState<string>();
  const [bindingError, setBindingError] = useState<string>();
  const [certificateError, setCertificateError] = useState<string>();
  const [pendingRemoval, setPendingRemoval] = useState<Binding>();
  const bindingLoadSequence = useRef(0);
  const certificateLoadSequence = useRef(0);

  const loadCertificates = useCallback(async (targetPage: number) => {
    const sequence = ++certificateLoadSequence.current;
    setCertificateBusy(true);
    setCertificateError(undefined);
    try {
      const certificateResult = await client.certificate.list({
        domainId: domain.id,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      if (sequence !== certificateLoadSequence.current) return;
      setCertificates(certificateResult.items);
      setCertificatePageInfo(certificateResult.pageInfo);
    } catch (cause) {
      if (sequence === certificateLoadSequence.current) {
        setCertificateError(errorMessage(cause, locale));
      }
    } finally {
      if (sequence === certificateLoadSequence.current) setCertificateBusy(false);
    }
  }, [client, domain.id, locale]);

  const loadBindings = useCallback(async (targetPage: number) => {
    const sequence = ++bindingLoadSequence.current;
    if (!applicationId) {
      setBindings([]);
      setBindingPageInfo(undefined);
      setBindingError(undefined);
      setBindingBusy(false);
      return;
    }
    setBindingBusy(true);
    setBindingError(undefined);
    try {
      const bindingResult = await client.certificate.applications.domains.listenerCertificateBindings.list(
        applicationId,
        domain.id,
        { page: targetPage, pageSize: PAGE_SIZE },
      );
      if (sequence !== bindingLoadSequence.current) return;
      setBindings(bindingResult.items);
      setBindingPageInfo(bindingResult.pageInfo);
      setIsDefault((current) => current || bindingResult.items.length === 0);
    } catch (cause) {
      if (sequence === bindingLoadSequence.current) {
        setBindingError(errorMessage(cause, locale));
      }
    } finally {
      if (sequence === bindingLoadSequence.current) setBindingBusy(false);
    }
  }, [applicationId, client, domain.id, locale]);

  useEffect(() => {
    void loadCertificates(certificatePage);
  }, [certificatePage, loadCertificates]);

  useEffect(() => {
    void loadBindings(bindingPage);
  }, [bindingPage, loadBindings]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !actionBusy) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionBusy, onClose]);

  const boundCertificateIds = useMemo(
    () => new Set(bindings.map((binding) => binding.certificateId)),
    [bindings],
  );
  const boundAlgorithms = useMemo(
    () => new Set(bindings.filter((binding) => binding.status === "ACTIVE").map((binding) => binding.keyAlgorithm)),
    [bindings],
  );
  const selectedCertificate = certificates.find((certificate) => certificate.id === selectedCertificateId);
  const bindingHasNext = hasNextPage(bindingPageInfo, bindingPage);
  const certificateHasNext = hasNextPage(certificatePageInfo, certificatePage);

  async function bindCertificate(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (
      !applicationId
      || !selectedCertificate
      || certificateBindingUnavailableReason(selectedCertificate, boundCertificateIds, boundAlgorithms, copy)
    ) return;
    if (!Number.isInteger(priority) || priority < 0 || priority > 10000) {
      setActionError(copy.priorityInvalid);
      return;
    }
    setActionBusy("bind");
    setActionError(undefined);
    try {
      await client.certificate.applications.domains.listenerCertificateBindings.create(
        applicationId,
        domain.id,
        {
          certificateId: selectedCertificate.id,
          isDefault,
          priority,
        },
        { idempotencyKey: idempotencyKey("listener-certificate-bind") },
      );
      setSelectedCertificateId("");
      await loadBindings(bindingPage);
      onChanged();
    } catch (cause) {
      setActionError(errorMessage(cause, locale));
    } finally {
      setActionBusy("");
    }
  }

  async function issueCertificate(): Promise<void> {
    if (!domain.isVerified) return;
    setActionBusy("issue");
    setActionError(undefined);
    try {
      const certificate = await client.certificate.create(
        {
          autoRenew: true,
          certType: 1,
          domainIds: [domain.id],
          keyAlgorithm,
        },
        { idempotencyKey: idempotencyKey("certificate-issue") },
      );
      setCertificatePage(1);
      setSelectedCertificateId(certificate.status === "ISSUED" ? certificate.id : "");
      await loadCertificates(1);
      onChanged();
    } catch (cause) {
      setActionError(errorMessage(cause, locale));
    } finally {
      setActionBusy("");
    }
  }

  async function removeCertificate(): Promise<void> {
    if (!applicationId || !pendingRemoval) return;
    setActionBusy(`remove:${pendingRemoval.id}`);
    setActionError(undefined);
    try {
      await client.certificate.applications.domains.listenerCertificateBindings.delete(
        applicationId,
        domain.id,
        pendingRemoval.id,
        { idempotencyKey: idempotencyKey("listener-certificate-unbind") },
      );
      setPendingRemoval(undefined);
      await loadBindings(bindingPage);
      onChanged();
    } catch (cause) {
      setActionError(errorMessage(cause, locale));
    } finally {
      setActionBusy("");
    }
  }

  return (
    <div className="root-domain-dialog-backdrop" role="presentation">
      <section aria-label={copy.certificatesForHostname.replace("{hostname}", domain.hostname)} aria-modal="true" className="root-domain-dialog certificate-bindings-dialog" role="dialog">
        <header>
          <div>
            <span>{copy.manageCertificates}</span>
            <h2>{domain.hostname}</h2>
          </div>
          <button aria-label={copy.close} className="icon-button" disabled={Boolean(actionBusy)} onClick={onClose} title={copy.close} type="button">
            <X aria-hidden="true" size={17} />
          </button>
        </header>

        {actionError ? <p className="domain-dialog-error" role="alert">{actionError}</p> : null}

        <section className="certificate-dialog-section">
          <div className="certificate-dialog-toolbar">
            <strong>{copy.domainCertificates}</strong>
            {canWrite ? (
              <div className="certificate-issue-row">
                <div aria-label={copy.keyAlgorithm} className="certificate-algorithm-control" role="group">
                  {(["ECDSA", "RSA"] as const).map((algorithm) => (
                    <button aria-pressed={keyAlgorithm === algorithm} className={keyAlgorithm === algorithm ? "is-selected" : undefined} key={algorithm} onClick={() => setKeyAlgorithm(algorithm)} type="button">
                      <KeyRound aria-hidden="true" size={14} />
                      {algorithm === "ECDSA" ? copy.ecdsa : copy.rsa}
                    </button>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  disabled={Boolean(actionBusy) || certificateBusy || !domain.isVerified}
                  onClick={() => void issueCertificate()}
                  title={domain.isVerified ? copy.issueNewCertificate : copy.verifyBeforeIssuingCertificate}
                  type="button"
                >
                  {actionBusy === "issue" ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : <ShieldCheck aria-hidden="true" size={15} />}
                  {copy.issueNewCertificate}
                </button>
              </div>
            ) : null}
            <button
              aria-label={copy.refresh}
              className="icon-button"
              disabled={certificateBusy || bindingBusy || Boolean(actionBusy)}
              onClick={() => void Promise.all([
                loadCertificates(certificatePage),
                loadBindings(bindingPage),
              ])}
              title={copy.refresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" className={certificateBusy || bindingBusy ? "is-spinning" : undefined} size={16} />
            </button>
          </div>

          {certificateError ? <p className="domain-dialog-error" role="alert">{certificateError}</p> : null}
          <div aria-busy={certificateBusy} className="certificate-inventory-list">
            {certificateBusy && certificates.length === 0 ? <DialogState copy={copy} emptyLabel={copy.noDomainCertificates} loading /> : null}
            {!certificateBusy && certificates.length === 0 ? <DialogState copy={copy} emptyLabel={copy.noDomainCertificates} /> : null}
            {certificates.map((certificate) => (
              <article className="certificate-inventory-row" key={certificate.id}>
                <div className="certificate-binding-identity">
                  <ShieldCheck aria-hidden="true" size={18} />
                  <div>
                    <strong>{certificate.certName}</strong>
                    <small>{certificate.identifiers.map((identifier) => identifier.hostname).join(", ")}</small>
                    <small>{certificate.issuer || "-"}</small>
                  </div>
                </div>
                <dl>
                  <div><dt>{copy.keyAlgorithm}</dt><dd>{certificate.keyAlgorithm}</dd></div>
                  <div><dt>{copy.expiresAt}</dt><dd>{formatDate(certificate.notAfter, locale)}</dd></div>
                  <div><dt>{copy.certificateStatus}</dt><dd><Status label={certificateStatus(certificate.status, copy)} tone={certificateStatusTone(certificate.status)} /></dd></div>
                  <div><dt>{copy.fingerprint}</dt><dd title={certificate.fingerprint}>{shortFingerprint(certificate.fingerprint)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <DialogPagination
            busy={certificateBusy}
            copy={copy}
            hasNext={certificateHasNext}
            onNext={() => setCertificatePage((current) => current + 1)}
            onPrevious={() => setCertificatePage((current) => Math.max(1, current - 1))}
            page={certificatePage}
          />
        </section>

        <section className="certificate-dialog-section certificate-listener-section">
          <div className="certificate-dialog-toolbar">
            <strong>{copy.listenerCertificateBindings}</strong>
          </div>

          {!applicationId ? <p className="certificate-binding-unavailable">{copy.unavailableCertificateBinding}</p> : null}
          {applicationId && bindingError ? <p className="domain-dialog-error" role="alert">{bindingError}</p> : null}
          {applicationId ? (
            <>
              <div aria-busy={bindingBusy} className="certificate-binding-list">
                {bindingBusy && bindings.length === 0 ? <DialogState copy={copy} emptyLabel={copy.noCertificateBindings} loading /> : null}
                {!bindingBusy && bindings.length === 0 ? <DialogState copy={copy} emptyLabel={copy.noCertificateBindings} /> : null}
                {bindings.map((binding) => {
                  const displayedCertificate = binding.currentCertificate ?? binding.desiredCertificate;
                  const isRollingOut = binding.currentCertificateVersionId !== binding.desiredCertificateVersionId;
                  return (
                  <article className="certificate-binding-row" key={binding.id}>
                    <div className="certificate-binding-identity">
                      <ShieldCheck aria-hidden="true" size={18} />
                      <div>
                        <strong>{displayedCertificate.certName}</strong>
                        <small>{displayedCertificate.identifiers.map((identifier) => identifier.hostname).join(", ")}</small>
                        <small>{displayedCertificate.issuer || "-"}</small>
                      </div>
                    </div>
                    <dl>
                      <div><dt>{copy.keyAlgorithm}</dt><dd>{binding.keyAlgorithm}</dd></div>
                      <div><dt>{copy.expiresAt}</dt><dd>{formatDate(displayedCertificate.notAfter, locale)}</dd></div>
                      <div><dt>{copy.priority}</dt><dd>{binding.priority}</dd></div>
                      <div><dt>{copy.bindingStatus}</dt><dd><Status label={bindingStatus(binding, copy)} tone={bindingStatusTone(binding)} /></dd></div>
                      <div><dt>{copy.certificateStatus}</dt><dd>{certificateStatus(displayedCertificate.status, copy)}</dd></div>
                      <div><dt>{copy.fingerprint}</dt><dd title={displayedCertificate.fingerprint}>{shortFingerprint(displayedCertificate.fingerprint)}</dd></div>
                      {isRollingOut ? <div><dt>{copy.desiredCertificate}</dt><dd title={binding.desiredCertificate.fingerprint}>{shortFingerprint(binding.desiredCertificate.fingerprint)}</dd></div> : null}
                    </dl>
                    {binding.isDefault ? <span className="default-certificate-mark">{copy.defaultCertificate}</span> : null}
                    {canWrite ? (
                      <button aria-label={copy.removeCertificate} className="icon-button danger-icon-button" disabled={Boolean(actionBusy)} onClick={() => setPendingRemoval(binding)} title={copy.removeCertificate} type="button">
                        <Trash2 aria-hidden="true" size={15} />
                      </button>
                    ) : null}
                  </article>
                  );
                })}
              </div>
              <DialogPagination
                busy={bindingBusy}
                copy={copy}
                hasNext={bindingHasNext}
                onNext={() => setBindingPage((current) => current + 1)}
                onPrevious={() => setBindingPage((current) => Math.max(1, current - 1))}
                page={bindingPage}
              />

              {canWrite ? (
                <form className="certificate-bind-form" onSubmit={(event) => void bindCertificate(event)}>
                  <fieldset disabled={Boolean(actionBusy) || certificateBusy}>
                    <legend>{copy.selectCertificate}</legend>
                    <div className="certificate-candidate-list">
                      {certificates.length === 0 ? <p>{copy.noCompatibleCertificates}</p> : null}
                      {certificates.map((certificate) => {
                        const unavailableReason = certificateBindingUnavailableReason(
                          certificate,
                          boundCertificateIds,
                          boundAlgorithms,
                          copy,
                        );
                        return (
                          <label className={unavailableReason ? "is-disabled" : undefined} key={certificate.id}>
                            <input checked={selectedCertificateId === certificate.id} disabled={Boolean(unavailableReason)} name="certificateId" onChange={() => setSelectedCertificateId(certificate.id)} type="radio" />
                            <span>
                              <strong>{certificate.certName}</strong>
                              <small>{certificate.identifiers.map((identifier) => identifier.hostname).join(", ")}</small>
                              <small>{certificate.issuer || "-"} · {formatDate(certificate.notAfter, locale)}</small>
                              {unavailableReason ? <small className="certificate-candidate-reason">{unavailableReason}</small> : null}
                            </span>
                            <em>{certificate.keyAlgorithm}</em>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="certificate-binding-options">
                    <label>
                      <span>{copy.priority}</span>
                      <input max={10000} min={0} onChange={(event) => setPriority(Number(event.target.value))} type="number" value={priority} />
                    </label>
                    <label className="certificate-default-toggle">
                      <input checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} type="checkbox" />
                      <span>{copy.defaultCertificate}</span>
                    </label>
                  </div>

                  <footer className="domain-dialog-footer">
                    <button className="secondary-button" disabled={Boolean(actionBusy)} onClick={onClose} type="button">{copy.cancel}</button>
                    <button
                      className="command-button"
                      disabled={
                        certificateBusy
                        || !selectedCertificate
                        || Boolean(certificateBindingUnavailableReason(selectedCertificate, boundCertificateIds, boundAlgorithms, copy))
                        || Boolean(actionBusy)
                      }
                      type="submit"
                    >
                      {actionBusy === "bind" ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : <Link2 aria-hidden="true" size={15} />}
                      {copy.bindCertificate}
                    </button>
                  </footer>
                </form>
              ) : null}
            </>
          ) : null}
        </section>

        {!applicationId || !canWrite ? (
          <footer className="domain-dialog-footer">
            <button className="secondary-button" disabled={Boolean(actionBusy)} onClick={onClose} type="button">{copy.close}</button>
          </footer>
        ) : null}

        {pendingRemoval ? (
          <div className="certificate-removal-confirmation" role="alertdialog" aria-label={copy.removeCertificate}>
            <p>{copy.removeCertificateDetail.replace("{certificate}", (pendingRemoval.currentCertificate ?? pendingRemoval.desiredCertificate).certName).replace("{hostname}", domain.hostname)}</p>
            <div>
              <button className="secondary-button" disabled={Boolean(actionBusy)} onClick={() => setPendingRemoval(undefined)} type="button">{copy.cancel}</button>
              <button className="danger-button" disabled={Boolean(actionBusy)} onClick={() => void removeCertificate()} type="button">{copy.confirmUnbind}</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DialogState({ copy, emptyLabel, loading = false }: {
  copy: DomainMessages;
  emptyLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="certificate-dialog-state" role={loading ? "status" : undefined}>
      {loading ? <LoaderCircle aria-hidden="true" className="is-spinning" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
      {loading ? copy.loading : emptyLabel}
    </div>
  );
}

function DialogPagination({ busy, copy, hasNext, onNext, onPrevious, page }: {
  busy: boolean;
  copy: DomainMessages;
  hasNext: boolean;
  onNext(): void;
  onPrevious(): void;
  page: number;
}) {
  return (
    <div className="certificate-dialog-pagination">
      <span>{copy.page.replace("{page}", String(page))}</span>
      <button aria-label={copy.previous} className="icon-button" disabled={busy || page <= 1} onClick={onPrevious} title={copy.previous} type="button"><ChevronLeft aria-hidden="true" size={16} /></button>
      <button aria-label={copy.next} className="icon-button" disabled={busy || !hasNext} onClick={onNext} title={copy.next} type="button"><ChevronRight aria-hidden="true" size={16} /></button>
    </div>
  );
}

type StatusTone = "danger" | "muted" | "success" | "warning";

function Status({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`domain-status domain-status-${tone}`}><i aria-hidden="true" />{label}</span>;
}

function bindingStatus(binding: Binding, copy: DomainMessages): string {
  if (binding.status === "ACTIVE") return copy.certificateActive;
  if (binding.status === "DEPLOYING") return copy.deploying;
  if (binding.status === "PAUSED") return copy.certificatePaused;
  if (binding.status === "FAILED") return copy.certificateFailed;
  if (binding.status === "ARCHIVED") return copy.certificateArchived;
  return copy.certificatePending;
}

function certificateStatus(status: Certificate["status"], copy: DomainMessages): string {
  if (status === "ISSUED") return copy.certificateIssued;
  if (status === "FAILED") return copy.certificateFailed;
  if (status === "EXPIRED") return copy.certificateExpired;
  if (status === "REVOKED") return copy.certificateRevoked;
  if (status === "ARCHIVED") return copy.certificateArchived;
  return copy.certificatePending;
}

function bindingStatusTone(binding: Binding): StatusTone {
  if (binding.status === "ACTIVE") return "success";
  if (binding.status === "FAILED") return "danger";
  if (binding.status === "ARCHIVED") return "muted";
  return "warning";
}

function certificateStatusTone(status: Certificate["status"]): StatusTone {
  if (status === "ISSUED") return "success";
  if (status === "FAILED" || status === "EXPIRED" || status === "REVOKED") return "danger";
  if (status === "ARCHIVED") return "muted";
  return "warning";
}

function certificateBindingUnavailableReason(
  certificate: Certificate,
  boundCertificateIds: ReadonlySet<string>,
  boundAlgorithms: ReadonlySet<string>,
  copy: DomainMessages,
): string | undefined {
  if (boundCertificateIds.has(certificate.id)) return copy.certificateAlreadyBound;
  if (certificate.status === "PENDING") return copy.certificatePendingCannotBind;
  if (certificate.status === "EXPIRED") return copy.certificateExpiredCannotBind;
  if (certificate.status === "REVOKED") return copy.certificateRevokedCannotBind;
  if (certificate.status === "ARCHIVED") return copy.certificateArchivedCannotBind;
  if (certificate.status !== "ISSUED") return copy.certificateUnavailableCannotBind;
  if (boundAlgorithms.has(certificate.keyAlgorithm)) return copy.certificateAlgorithmAlreadyBound;
  return undefined;
}

function shortFingerprint(value: string | undefined): string {
  if (!value) return "-";
  return value.length <= 20 ? value : `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatDate(value: string | undefined, locale: WebserverLocale): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function hasNextPage(pageInfo: { hasMore?: boolean; totalItems?: string } | undefined, page: number): boolean {
  if (pageInfo?.hasMore !== undefined) return pageInfo.hasMore;
  const total = Number(pageInfo?.totalItems);
  return Number.isFinite(total) && page * PAGE_SIZE < total;
}

function errorMessage(cause: unknown, locale: WebserverLocale): string {
  return formatWebserverErrorMessage(cause, (key, values) => translateWebserver(locale, key, values));
}

function idempotencyKey(action: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${action}-${uuid}`;
}
