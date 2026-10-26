import { CONTRACT_VERSION } from "@ckace/contracts";
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { RuntimeReadinessService } from "./runtime/runtime-readiness.service";

@Controller()
export class HealthController {
  constructor(
    @Inject(RuntimeReadinessService)
    private readonly readiness: RuntimeReadinessService,
  ) {}

  @Get("health")
  getHealth() {
    const runtime = this.readiness.getRuntimeConfig();

    return {
      ok: true,
      service: "ckace-hr-api",
      stage: runtime.stage,
      runtime: runtime.stage === "production" ? "PRODUCTION" : "NON_PRODUCTION",
      moduleRouting: this.readiness.getModuleRoutingMode(),
      serviceRevision: runtime.serviceRevision,
      contractVersion: CONTRACT_VERSION,
    } as const;
  }

  @Get("test/database-attestation")
  async getTestDatabaseAttestation() {
    if (this.readiness.getRuntimeConfig().stage !== "test") {
      throw new NotFoundException();
    }

    try {
      return await this.readiness.attestTestDatabase();
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        attestation: "FAILED",
      });
    }
  }

  @Get("ready")
  async getReadiness() {
    const snapshot = await this.readiness.check();

    if (!snapshot.ok) {
      throw new ServiceUnavailableException(snapshot);
    }

    return snapshot;
  }
}
