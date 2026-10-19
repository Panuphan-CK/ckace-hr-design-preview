import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";

import type { SecurityRequest } from "./security-request";
import {
  DesktopAuthService,
} from "./desktop-auth.service";
import {
  desktopNavigationForPermissions,
} from "./desktop-navigation";
import {
  clearDesktopSessionCookie,
  desktopSessionCookie,
} from "./desktop-session";

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

interface LoginBody {
  readonly username?: unknown;
  readonly password?: unknown;
}

@Controller("desktop-auth")
export class DesktopAuthController {
  constructor(
    @Inject(DesktopAuthService)
    private readonly auth: DesktopAuthService,
  ) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginBody,
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const result = await this.auth.login({
      username: body?.username,
      password: body?.password,
      ...(request.correlationId
        ? { correlationId: request.correlationId }
        : {}),
    });

    response.setHeader(
      "Set-Cookie",
      desktopSessionCookie(
        result.token,
        process.env.CKACE_RUNTIME_STAGE,
      ),
    );

    return {
      authenticated: true,
      employeeId: result.actor.employeeId,
      authenticatedBy: result.actor.authenticatedBy,
      navigation: desktopNavigationForPermissions(
        result.actor.permissions,
      ),
      clientRoleAuthority: false,
    } as const;
  }

  /** The LIFF ID is public by design; kept in the runtime environment so it needs no rebuild. */
  @Get("line-config")
  lineConfig() {
    return { liffId: process.env.LIFF_ID?.trim() || null };
  }

  @Post("line-login")
  @HttpCode(200)
  async lineLogin(
    @Body() body: { readonly idToken?: unknown },
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const result = await this.auth.loginWithLine({
      idToken: body?.idToken,
      ...(request.correlationId
        ? { correlationId: request.correlationId }
        : {}),
    });
    response.setHeader(
      "Set-Cookie",
      desktopSessionCookie(
        result.token,
        process.env.CKACE_RUNTIME_STAGE,
      ),
    );
    return {
      authenticated: true,
      employeeId: result.actor.employeeId,
      navigation: desktopNavigationForPermissions(
        result.actor.permissions,
      ),
      clientRoleAuthority: false,
    } as const;
  }

  @Post("logout")
  @HttpCode(200)
  logout(
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      "Set-Cookie",
      clearDesktopSessionCookie(
        process.env.CKACE_RUNTIME_STAGE,
      ),
    );
    return { authenticated: false } as const;
  }

  @Post("require-session")
  @HttpCode(200)
  requireSession(@Req() request: SecurityRequest) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }
    return {
      authenticated: true,
      employeeId: request.actor.employeeId,
    } as const;
  }
}
