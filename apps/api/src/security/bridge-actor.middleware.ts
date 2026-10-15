import {
  verifyActorEnvelope,
  type SignedActorEnvelope,
} from "@ckace/auth";
import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import type { SecurityRequest } from "./security-request";

const BRIDGE_HEADER = "x-ckace-bridge-envelope";
const MAX_ENVELOPE_HEADER_BYTES = 16_384;

interface BridgeSecurityRequest extends SecurityRequest {
  headers: Record<string, string | string[] | undefined>;
}

function readEnvelopeHeader(
  request: BridgeSecurityRequest,
): string | null {
  const raw = request.headers[BRIDGE_HEADER];

  if (raw === undefined) {
    return null;
  }

  if (
    Array.isArray(raw) ||
    Buffer.byteLength(raw, "utf8") > MAX_ENVELOPE_HEADER_BYTES
  ) {
    throw new UnauthorizedException("Invalid bridge authentication");
  }

  return raw;
}

function decodeEnvelope(encoded: string): SignedActorEnvelope {
  const json = Buffer.from(encoded, "base64url").toString("utf8");
  return JSON.parse(json) as SignedActorEnvelope;
}

@Injectable()
export class BridgeActorMiddleware {
  use(
    request: BridgeSecurityRequest,
    _response: unknown,
    next: () => void,
  ): void {
    const encodedEnvelope = readEnvelopeHeader(request);

    if (!encodedEnvelope) {
      next();
      return;
    }

    try {
      const secret = process.env.CKACE_LEGACY_BRIDGE_SECRET?.trim();

      if (!secret) {
        throw new Error("Bridge secret unavailable");
      }

      const actor = verifyActorEnvelope(
        decodeEnvelope(encodedEnvelope),
        secret,
      );

      if (actor.authenticatedBy !== "LEGACY_DESKTOP_BRIDGE") {
        throw new Error("Unexpected bridge authentication source");
      }

      request.actor = {
        ...actor,
        correlationId:
          request.correlationId ?? actor.correlationId,
      };

      next();
    } catch {
      throw new UnauthorizedException(
        "Invalid bridge authentication",
      );
    }
  }
}
