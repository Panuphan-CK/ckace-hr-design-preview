import type { AttachmentDownloadResult } from "@ckace/contracts";

/** Open a tab synchronously within the click gesture, before requesting a private grant. */
export function preparePrivateDownloadTab(
  open: (url: string, target: string) => Window | null = (url, target) => window.open(url, target),
): Window {
  const tab = open("about:blank", "_blank");
  if (!tab) throw new Error("เบราว์เซอร์บล็อกหน้าต่างดาวน์โหลด กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง");
  tab.opener = null;
  return tab;
}

export async function showPrivateDownload(
  tab: Window,
  grant: AttachmentDownloadResult,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const { url, requiredHeaders, method } = grant.download;
  if (!Object.keys(requiredHeaders).length) {
    tab.location.href = url;
    return;
  }
  const response = await fetcher(url, { method, headers: requiredHeaders });
  if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดไฟล์ส่วนตัวได้");
  const localUrl = URL.createObjectURL(await response.blob());
  tab.location.href = localUrl;
  window.setTimeout(() => URL.revokeObjectURL(localUrl), 60_000);
}
