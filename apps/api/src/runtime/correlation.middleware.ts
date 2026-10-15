import { randomUUID } from "node:crypto";

import {
  Injectable,
  type NestMiddleware,
} from "@nestjs/common";

export interface CorrelatedRequest {
  correlationId?: string;
}

interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

@Injectable()
export class CorrelationMiddleware
  implements NestMiddleware<CorrelatedRequest, CorrelationResponse>
{
  use(
    request: CorrelatedRequest,
    response: CorrelationResponse,
    next: () => void,
  ): void {
    const correlationId = randomUUID();
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    next();
  }
}
