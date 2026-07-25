import { useSdkworkAuthControllerState, type SdkworkAuthController } from "@sdkwork/auth-pc-react";
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

const BOOTSTRAP_TIMEOUT_MS = 6_000;
export function WebserverAuthGate({ authRoutes, children, controller }: { authRoutes: ReactNode; children: ReactNode; controller: SdkworkAuthController }) {
  const location = useLocation(); const state = useSdkworkAuthControllerState(controller); const onAuthRoute = location.pathname === "/auth" || location.pathname.startsWith("/auth/"); const [complete, setComplete] = useState(state.isBootstrapped);
  useEffect(() => { if (onAuthRoute || state.isBootstrapped) { setComplete(true); return; } let active = true; const timeout = globalThis.setTimeout(() => { if (active) setComplete(true); }, BOOTSTRAP_TIMEOUT_MS); void controller.bootstrap().finally(() => { globalThis.clearTimeout(timeout); if (active) setComplete(true); }); return () => { active = false; globalThis.clearTimeout(timeout); }; }, [controller, onAuthRoute, state.isBootstrapped]);
  if (onAuthRoute) return <>{authRoutes}</>;
  if (!complete) return <div className="bootstrap-state" role="status">SDKWork Web Server</div>;
  if (!state.isAuthenticated) return <Navigate to={`/auth/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  return <>{children}</>;
}

