import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent } from "react";

import type { WebserverAdminSdkClient } from "@sdkwork/webserver-pc-admin-core";

type ApplicationPage = Awaited<ReturnType<WebserverAdminSdkClient["application"]["list"]>>;
type Application = ApplicationPage["items"][number];

export interface ApplicationPickerCopy {
  loading: string;
  next: string;
  noApplications: string;
  operationFailed: string;
  page: string;
  previous: string;
  searchApplications: string;
  searchApplicationsPlaceholder: string;
  total: string;
  unbound: string;
}

interface ApplicationPickerProps {
  allowUnbound?: boolean;
  client: WebserverAdminSdkClient;
  copy: ApplicationPickerCopy;
  onChange(applicationId: string): void;
  value: string;
}

const APPLICATION_PAGE_SIZE = 10;

export function ApplicationPicker({
  allowUnbound = false,
  client,
  copy,
  onChange,
  value,
}: ApplicationPickerProps) {
  const groupName = useId();
  const [items, setItems] = useState<readonly Application[]>([]);
  const [pageInfo, setPageInfo] = useState<ApplicationPage["pageInfo"]>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(undefined);
    void client.application.list(
      {
        keyword: keyword || undefined,
        page,
        pageSize: APPLICATION_PAGE_SIZE,
      },
      { signal: controller.signal, timeout: undefined },
    ).then((response) => {
      if (controller.signal.aborted) return;
      setItems(response.items);
      setPageInfo(response.pageInfo);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error && cause.message.trim() ? cause.message : copy.operationFailed);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => controller.abort();
  }, [client, copy.operationFailed, keyword, page]);

  const total = numericCount(pageInfo?.totalItems);
  const hasNext = pageInfo?.hasMore ?? (total !== undefined && page * APPLICATION_PAGE_SIZE < total);

  function applySearch(): void {
    setPage(1);
    setKeyword(search.trim());
    onChange("");
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applySearch();
  }

  return (
    <div className="application-picker">
      <div className="application-picker-search" role="search">
        <input
          aria-label={copy.searchApplications}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={copy.searchApplicationsPlaceholder}
          value={search}
        />
        <button
          aria-label={copy.searchApplications}
          className="icon-button"
          onClick={applySearch}
          title={copy.searchApplications}
          type="button"
        >
          <Search aria-hidden="true" size={15} />
        </button>
      </div>

      {error ? <p className="domain-dialog-error" role="alert">{error}</p> : null}
      <div aria-busy={busy} aria-label={copy.searchApplications} className="application-picker-options" role="radiogroup">
        {allowUnbound ? (
          <label className="application-picker-option">
            <input
              checked={value === ""}
              disabled={busy}
              name={groupName}
              onChange={() => onChange("")}
              type="radio"
              value=""
            />
            <span><strong>{copy.unbound}</strong></span>
          </label>
        ) : null}
        {items.map((application) => (
          <label className="application-picker-option" key={application.id}>
            <input
              checked={value === application.id}
              disabled={busy}
              name={groupName}
              onChange={() => onChange(application.id)}
              type="radio"
              value={application.id}
            />
            <span>
              <strong>{application.name}</strong>
              <small>{application.applicationType}</small>
            </span>
          </label>
        ))}
        {busy && items.length === 0 ? (
          <div className="application-picker-state" role="status">
            <LoaderCircle aria-hidden="true" className="is-spinning" size={17} />
            {copy.loading}
          </div>
        ) : null}
        {!busy && items.length === 0 ? (
          <div className="application-picker-state">
            <Inbox aria-hidden="true" size={17} />
            {copy.noApplications}
          </div>
        ) : null}
      </div>

      <footer className="application-picker-pagination">
        <span>
          {total === undefined
            ? copy.page.replace("{page}", String(page))
            : copy.total.replace("{total}", String(total))}
        </span>
        <button
          aria-label={copy.previous}
          className="icon-button"
          disabled={busy || page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          title={copy.previous}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <button
          aria-label={copy.next}
          className="icon-button"
          disabled={busy || !hasNext}
          onClick={() => setPage((current) => current + 1)}
          title={copy.next}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </footer>
    </div>
  );
}

function numericCount(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
