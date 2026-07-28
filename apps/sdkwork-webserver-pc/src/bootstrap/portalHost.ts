import type { PortalClipboardPort } from "@sdkwork/webserver-pc-portal";

export const browserPortalClipboard: PortalClipboardPort = {
  async writeText(value) {
    if (globalThis.navigator.clipboard?.writeText) {
      try {
        await globalThis.navigator.clipboard.writeText(value);
        return;
      } catch {
        // Some embedded browser contexts expose Clipboard but reject writes.
      }
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.inset = "-9999px auto auto -9999px";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Clipboard write is unavailable.");
  },
};
