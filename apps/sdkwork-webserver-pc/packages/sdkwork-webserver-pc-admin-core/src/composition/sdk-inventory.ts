export function listWebserverCoreSdkInventory() {
  return [
    { packageName: "@sdkwork/web-backend-sdk", authority: "sdkwork-web.backend", surface: "backend-api" },
  ] as const;
}
