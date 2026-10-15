import {
  describe,
  expect,
  it,
} from "vitest";

import {
  clearDesktopSessionCookie,
  DESKTOP_SESSION_COOKIE,
  desktopSessionCookie,
  issueDesktopSessionToken,
  readCookie,
  verifyDesktopSessionToken,
} from "./desktop-session";

const secret = "x".repeat(48);

describe("Desktop signed session", () => {
  it("issues and verifies an eight-hour server-signed session", () => {
    const issued = issueDesktopSessionToken({
      employeeId: "employee-1",
      secret,
      nowSeconds: 1_000,
    });

    expect(
      verifyDesktopSessionToken({
        token: issued.token,
        secret,
        nowSeconds: 1_100,
      }),
    ).toMatchObject({
      version: 1,
      employeeId: "employee-1",
      issuedAt: 1_000,
      expiresAt: 29_800,
    });
  });

  it("rejects tampering, expiry and weak secrets", () => {
    const issued = issueDesktopSessionToken({
      employeeId: "employee-1",
      secret,
      nowSeconds: 1_000,
    });
    const tampered =
      issued.token.slice(0, -1) +
      (issued.token.endsWith("a") ? "b" : "a");

    expect(() =>
      verifyDesktopSessionToken({
        token: tampered,
        secret,
        nowSeconds: 1_100,
      }),
    ).toThrow();

    expect(() =>
      verifyDesktopSessionToken({
        token: issued.token,
        secret,
        nowSeconds: 29_800,
      }),
    ).toThrow();

    expect(() =>
      issueDesktopSessionToken({
        employeeId: "employee-1",
        secret: "too-short",
      }),
    ).toThrow(/32 bytes/);
  });

  it("reads only the named cookie and emits hardened hosted attributes", () => {
    expect(
      readCookie(
        `a=1; ${DESKTOP_SESSION_COOKIE}=abc.def; b=2`,
        DESKTOP_SESSION_COOKIE,
      ),
    ).toBe("abc.def");

    expect(desktopSessionCookie("token", "test")).toContain(
      "HttpOnly",
    );
    expect(desktopSessionCookie("token", "test")).toContain(
      "SameSite=Strict",
    );
    expect(desktopSessionCookie("token", "test")).toContain(
      "Secure",
    );
    expect(desktopSessionCookie("token", "local")).not.toContain(
      "Secure",
    );
    expect(clearDesktopSessionCookie("test")).toContain(
      "Max-Age=0",
    );
  });
});
