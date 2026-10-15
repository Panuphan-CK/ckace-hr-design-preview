import { describe, expect, it, vi } from "vitest";
import { preparePrivateDownloadTab, showPrivateDownload } from "./private-download";

describe("Desktop private attachment tab", () => {
  it("opens within click gesture and severs opener", () => {
    const tab = { opener: {} } as unknown as Window;
    const open = vi.fn().mockReturnValue(tab);
    expect(preparePrivateDownloadTab(open)).toBe(tab);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
  });
  it("rejects popup blocking without silently losing the file action", () => {
    expect(() => preparePrivateDownloadTab(() => null)).toThrow(/Pop-up/);
  });
  it("navigates granted no-header URL without a second window.open", async () => {
    const tab = { location: { href: "about:blank" } } as unknown as Window;
    const fetcher = vi.fn();
    await showPrivateDownload(tab, { attachmentId: "a", download: { url: "https://file.example/private", method: "GET", requiredHeaders: {}, expiresAt: "2026-10-08T10:00:00.000Z" } } as never, fetcher);
    expect(tab.location.href).toBe("https://file.example/private");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
