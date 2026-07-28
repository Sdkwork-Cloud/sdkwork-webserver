# SDKWork Webserver PC Portal Contract

This package owns the public, user-facing Web Server portal. It presents the existing application publishing, cloud deployment, delivery, certificate, rollback, and agent-skill entrypoints without constructing SDK clients or implementing upload/deployment transport.

The application root injects Console, deployment, publishing, and Messaging PC notification-center navigation targets, a browser clipboard port, and an optional read-only authenticated viewer. The portal exports one primary React view, public route metadata, and its integration contracts through the package root. Notification behavior and SDK integration remain owned by `sdkwork-messaging-pc`; this package owns only the cross-application navigation port.
