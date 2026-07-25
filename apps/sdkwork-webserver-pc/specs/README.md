# SDKWork Webserver PC Contract

The application is a browser composition root with two isolated surfaces:

- `app-console`: standalone tenant operations through `@sdkwork/web-app-sdk`.
- `backend-admin`: internal Web Server operations through `@sdkwork/web-backend-sdk`.

The root owns runtime configuration, IAM bootstrap, the shared TokenManager, route composition, and lazy loading. Capability packages own navigation metadata; surface core packages own generated SDK adaptation. Drive uploads and cloud publishing do not belong to this application.

