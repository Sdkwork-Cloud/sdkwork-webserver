import { lazy, Suspense } from "react";
import { WebserverAuthGate } from "../auth/WebserverAuthGate.tsx";
import type { BootstrappedWebserverPcRuntime } from "../bootstrap/runtime.ts";

const LazyAuthRoutes = lazy(() => import("../auth/WebserverAuthRoutes.tsx").then((module) => ({ default: module.WebserverAuthRoutes })));
const LazyAuthorizedWorkspace = lazy(() => import("./WebserverAuthorizedWorkspace.tsx").then((module) => ({ default: module.WebserverAuthorizedWorkspace })));

export function WebserverAuthenticatedSurface({ runtime }: { runtime: BootstrappedWebserverPcRuntime }) {
  return (
    <WebserverAuthGate
      authRoutes={(
        <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
          <LazyAuthRoutes
            controller={runtime.authController}
            loadRuntimeConfig={runtime.loadAuthRuntimeConfig}
            locale={runtime.locale}
          />
        </Suspense>
      )}
      controller={runtime.authController}
      locale={runtime.locale}
    >
      <Suspense fallback={<div className="bootstrap-state">SDKWork Web Server</div>}>
        <LazyAuthorizedWorkspace runtime={runtime} />
      </Suspense>
    </WebserverAuthGate>
  );
}
