import {
  SDKWORK_AUTH_I18N_CATALOG,
  SdkworkAuthOAuthCallbackPage,
  SdkworkAuthPage,
  mergeSdkworkAuthClassNames,
  type SdkworkAuthAppearanceConfig,
  type SdkworkAuthController,
  type SdkworkAuthHeaderSlotProps,
  type SdkworkAuthRuntimeConfig,
} from "@sdkwork/auth-pc-react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { useSdkworkTheme } from "@sdkwork/ui-pc-react/theme";
import { Moon, ServerCog, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  resolveWebserverAuthHostMessages,
  type WebserverAuthHostMessages,
} from "./messages.ts";
import { WebserverAuthStatus } from "./WebserverAuthStatus.tsx";

type RuntimeConfigState =
  | { status: "loading" }
  | { status: "ready"; value: SdkworkAuthRuntimeConfig }
  | { status: "unavailable" };

const WebserverAuthHostMessagesContext = createContext<WebserverAuthHostMessages | null>(null);

const WEBSERVER_AUTH_APPEARANCE: SdkworkAuthAppearanceConfig = {
  asidePanelClassName: "webserver-auth-aside",
  contentContainerClassName: "webserver-auth-content",
  pageClassName: "webserver-auth-page",
  qrFrameClassName: "webserver-auth-qr-frame",
  shellClassName: "webserver-auth-shell",
  slotProps: {
    asideContainer: {
      className: "webserver-auth-aside-container",
    },
  },
  slots: {
    Background: EmptyBackground,
    Header,
  },
  theme: {
    asideCardBackgroundColor: "var(--webserver-auth-aside-card-background)",
    asideCardBorderColor: "var(--webserver-auth-aside-card-border)",
    asidePanelBackgroundColor: "var(--webserver-auth-aside-background)",
    asidePanelBorderColor: "var(--webserver-auth-aside-border)",
    asidePanelColor: "var(--webserver-auth-aside-text)",
    badgeBackgroundColor: "var(--webserver-auth-badge-background)",
    badgeTextColor: "var(--webserver-auth-badge-text)",
    contentBackgroundColor: "var(--webserver-auth-content-background)",
    contentBorderColor: "var(--webserver-auth-content-border)",
    contentTextColor: "var(--webserver-auth-content-text)",
    descriptionColor: "var(--webserver-auth-muted-text)",
    dividerColor: "var(--webserver-auth-divider)",
    fieldBackgroundColor: "var(--webserver-auth-field-background)",
    fieldBorderColor: "var(--webserver-auth-field-border)",
    fieldPlaceholderColor: "var(--webserver-auth-field-placeholder)",
    fieldTextColor: "var(--webserver-auth-content-text)",
    formMutedTextColor: "var(--webserver-auth-muted-text)",
    iconMutedColor: "var(--webserver-auth-icon-muted)",
    labelColor: "var(--webserver-auth-label)",
    pageBackgroundColor: "var(--webserver-auth-page-background)",
    qrFrameBackgroundColor: "var(--webserver-auth-qr-background)",
    qrFrameBorderColor: "var(--webserver-auth-qr-border)",
    shellBackgroundColor: "var(--webserver-auth-shell-background)",
    shellBorderColor: "var(--webserver-auth-shell-border)",
    tabActiveBackgroundColor: "var(--webserver-auth-tab-active-background)",
    tabActiveTextColor: "var(--webserver-auth-content-text)",
    tabBackgroundColor: "transparent",
    tabInactiveTextColor: "var(--webserver-auth-muted-text)",
    titleColor: "var(--webserver-auth-content-text)",
    validationMessageColor: "var(--webserver-auth-validation-text)",
  },
};

export function WebserverAuthRoutes({
  controller,
  loadRuntimeConfig,
  locale,
}: {
  controller: SdkworkAuthController;
  loadRuntimeConfig: () => Promise<SdkworkAuthRuntimeConfig>;
  locale: string;
}) {
  const location = useLocation();
  const messages = resolveWebserverAuthHostMessages(locale);
  const [attempt, setAttempt] = useState(0);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfigState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setRuntimeConfig({ status: "loading" });
    void loadRuntimeConfig()
      .then((value) => {
        if (active) {
          setRuntimeConfig({ status: "ready", value });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load IAM authentication metadata.", error);
        if (active) {
          setRuntimeConfig({ status: "unavailable" });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, loadRuntimeConfig]);

  if (runtimeConfig.status === "loading") {
    return <WebserverAuthStatus message={messages.metadataConnecting} />;
  }
  if (runtimeConfig.status === "unavailable") {
    return (
      <WebserverAuthStatus
        homeHref="/"
        homeLabel={messages.backToPortal}
        message={messages.metadataUnavailable}
        onRetry={() => setAttempt((current) => current + 1)}
        retryLabel={messages.retry}
      />
    );
  }

  const commonProps = {
    appearance: WEBSERVER_AUTH_APPEARANCE,
    basePath: "/auth",
    controller,
    homePath: "/",
    runtimeConfig: runtimeConfig.value,
  };
  const isOAuthCallback = location.pathname === "/auth/oauth/callback"
    || location.pathname.startsWith("/auth/oauth/callback/");

  return (
    <WebserverAuthHostMessagesContext.Provider value={messages}>
      <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale={locale}>
        {isOAuthCallback
          ? (
              <>
                <AuthThemeToggle className="webserver-auth-callback-theme-toggle" />
                <SdkworkAuthOAuthCallbackPage {...commonProps} />
              </>
            )
          : <SdkworkAuthPage {...commonProps} />}
      </SdkworkI18nProvider>
    </WebserverAuthHostMessagesContext.Provider>
  );
}

function Header({
  badge,
  className,
  description,
  style,
  title,
}: SdkworkAuthHeaderSlotProps) {
  return (
    <header className={mergeSdkworkAuthClassNames("auth-header", className)} style={style}>
      <div className="auth-brand-row">
        <div className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            <ServerCog size={18} strokeWidth={2} />
          </span>
          <strong>SDKWork Web Server</strong>
        </div>
        <AuthThemeToggle />
      </div>
      {badge}
      {title}
      {description}
    </header>
  );
}

function AuthThemeToggle({ className }: { className?: string }) {
  const messages = useContext(WebserverAuthHostMessagesContext);
  const { colorMode, setThemeSelection } = useSdkworkTheme();
  const isLightMode = colorMode === "light";
  const themeToggleLabel = isLightMode
    ? messages?.switchToDarkMode ?? "Switch to dark mode"
    : messages?.switchToLightMode ?? "Switch to light mode";

  return (
    <button
      aria-label={themeToggleLabel}
      className={mergeSdkworkAuthClassNames("auth-theme-toggle", className)}
      onClick={() => setThemeSelection(isLightMode ? "dark" : "light")}
      title={themeToggleLabel}
      type="button"
    >
      {isLightMode
        ? <Moon aria-hidden="true" size={17} />
        : <Sun aria-hidden="true" size={17} />}
    </button>
  );
}

function EmptyBackground() {
  return null;
}
