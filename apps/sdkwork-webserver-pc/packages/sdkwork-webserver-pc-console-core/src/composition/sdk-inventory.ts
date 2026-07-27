export function listWebserverCoreSdkInventory() {
  return [
    { packageName: "@sdkwork/web-app-sdk", authority: "sdkwork-web.app", surface: "app-api" },
  ] as const;
}
