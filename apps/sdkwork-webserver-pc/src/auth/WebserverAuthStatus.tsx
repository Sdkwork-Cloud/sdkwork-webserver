import { House, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

export function WebserverAuthStatus({
  homeHref,
  homeLabel,
  message,
  onRetry,
  retryLabel,
}: {
  homeHref?: string;
  homeLabel?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const unavailable = Boolean(onRetry);

  return (
    <main className="webserver-auth-status">
      <div className="webserver-auth-status__brand" aria-label="SDKWork Web Server">
        <span className="webserver-auth-status__mark" aria-hidden="true">WS</span>
        <strong>SDKWork Web Server</strong>
      </div>
      <div
        aria-live="polite"
        className="webserver-auth-status__message"
        role={unavailable ? "alert" : "status"}
      >
        {unavailable
          ? <TriangleAlert aria-hidden="true" size={20} />
          : <LoaderCircle aria-hidden="true" className="webserver-auth-status__spinner" size={20} />}
        <span>{message}</span>
      </div>
      {homeHref || onRetry ? (
        <div className="webserver-auth-status__actions">
          {homeHref && homeLabel ? (
            <a className="webserver-auth-status__home" href={homeHref}>
              <House aria-hidden="true" size={16} />
              <span>{homeLabel}</span>
            </a>
          ) : null}
          {onRetry ? (
            <button className="webserver-auth-status__retry" onClick={onRetry} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>{retryLabel}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
