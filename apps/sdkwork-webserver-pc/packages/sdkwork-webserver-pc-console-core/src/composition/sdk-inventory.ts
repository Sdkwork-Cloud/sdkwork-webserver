export function listWebserverCoreSdkInventory() {
  return [
    { packageName: "@sdkwork/web-app-sdk", authority: "sdkwork-web.app", surface: "app-api" },
    { packageName: "@sdkwork/drive-app-sdk", authority: "sdkwork-drive-app-api", surface: "app-api" },
  ] as const;
}
