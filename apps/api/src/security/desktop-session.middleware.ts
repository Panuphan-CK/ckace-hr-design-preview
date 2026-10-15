import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  DesktopAuthService,
} from "./desktop-auth.service";
import {
  DESKTOP_SESSION_COOKIE,
  readCookie,
} from "./desktop-session";
import type { SecurityRequest } from "./security-request";

interface DesktopSecurityRequest extends SecurityRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class DesktopSessionMiddleware {
  constructor(
    @Inject(DesktopAuthService)
    private readonly auth: DesktopAuthService,
  ) {}

  async use(
    request: DesktopSecurityRequest,
    _response: unknown,
    next: () => void,
  ): Promise<void> {
    if (request.actor) {
      next();
      return;
    }

    const rawCookie = request.headers.cookie;
    if (!rawCookie || Array.isArray(rawCookie)) {
      next();
      return;
    }
    const token = readCookie(
      rawCookie,
      DESKTOP_SESSION_COOKIE,
    );
    if (!token) {
      next();
      return;
    }

    try {
      request.actor = await this.auth.resolveSession({
        token,
        ...(request.correlationId
          ? { correlationId: request.correlationId }
          : {}),
      });
    } catch {
      // Invalid/expired sessions are treated as signed out so the
      // browser can reach the login endpoint and replace the cookie.
    }

    next();
  }
}
