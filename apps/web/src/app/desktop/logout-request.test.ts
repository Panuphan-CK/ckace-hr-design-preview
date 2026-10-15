import { describe, expect, it, vi } from "vitest";

import { requestDesktopLogout } from "./logout-request";

describe("Desktop logout confirmation", () => {
  it("confirms only an HTTP successful cookie-clearing response", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    expect(await requestDesktopLogout(fetcher)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith("/api/desktop-auth/logout", {
      method: "POST", credentials: "same-origin",
    });
  });

  it.each([401, 403, 500, 503])("does not confirm logout on HTTP %i", async (status) => {
    expect(await requestDesktopLogout(vi.fn().mockResolvedValue({ ok: false, status }))).toBe(false);
  });

  it("does not claim logout on an ambiguous network failure", async () => {
    expect(await requestDesktopLogout(vi.fn().mockRejectedValue(new Error("Network lost")))).toBe(false);
  });
});
