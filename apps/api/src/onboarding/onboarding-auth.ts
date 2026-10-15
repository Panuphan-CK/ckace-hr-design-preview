import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export function hashProjectPassword(password: string): string {
  if (password.length < 8 || password.length > 200) {
    throw new Error("Password must be 8-200 characters");
  }
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 32);
  return `scrypt-v1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

export function verifyProjectPassword(password: string, encoded: string): boolean {
  const [version, saltEncoded, digestEncoded] = encoded.split("$");
  if (version !== "scrypt-v1" || !saltEncoded || !digestEncoded) return false;
  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(digestEncoded, "base64url");
    const actual = scryptSync(password, salt, expected.byteLength);
    return expected.byteLength > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function verifyLegacyGasPassword(
  password: string,
  legacyHash: string,
  secretSalt: string,
): boolean {
  if (!legacyHash || !secretSalt) return false;
  const actual = createHash("sha256")
    .update(password + secretSalt, "utf8")
    .digest("base64");
  const a = Buffer.from(actual);
  const b = Buffer.from(legacyHash);
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}

export interface LineIdTokenVerifier {
  verify(idToken: string): Promise<string>;
}

export class LineVerifyApiTokenVerifier implements LineIdTokenVerifier {
  constructor(private readonly channelId: string) {}

  async verify(idToken: string): Promise<string> {
    if (!this.channelId.trim()) {
      throw new Error("LINE channel ID is not configured");
    }
    const token = idToken.trim();
    if (!token) throw new Error("LINE ID token is required");
    const body = new URLSearchParams({
      id_token: token,
      client_id: this.channelId,
    });
    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error("LINE ID token verification failed");
    const payload = await response.json() as { sub?: unknown };
    if (typeof payload.sub !== "string" || !payload.sub.trim()) {
      throw new Error("Verified LINE identity is missing subject");
    }
    return payload.sub.trim();
  }
}
