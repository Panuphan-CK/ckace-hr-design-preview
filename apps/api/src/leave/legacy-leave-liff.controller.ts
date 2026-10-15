import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
} from "@nestjs/common";

import {
  LegacyLeaveLiffService,
} from "./legacy-leave-liff.service";

const ACTIONS = new Set([
  "leave",
  "requests",
  "decision",
  "attachment",
]);

type LegacyAction =
  | "leave"
  | "requests"
  | "decision"
  | "attachment";

@Controller("leave/legacy-liff")
export class LegacyLeaveLiffController {
  constructor(
    @Inject(LegacyLeaveLiffService)
    private readonly service: LegacyLeaveLiffService,
  ) {}

  @Post(":action")
  dispatch(
    @Param("action") action: string,
    @Body() body: unknown,
  ): Promise<Record<string, unknown>> {
    if (!ACTIONS.has(action)) {
      throw new BadRequestException(
        "Unsupported legacy LEAVE action",
      );
    }
    return this.service.dispatch(
      action as LegacyAction,
      body,
    );
  }
}
