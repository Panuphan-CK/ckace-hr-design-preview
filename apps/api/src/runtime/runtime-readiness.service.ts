import {
  disconnectPrismaClient,
  getPrismaClient,
} from "@ckace/database";
import {
  Injectable,
  type OnApplicationShutdown,
} from "@nestjs/common";

import {
  readRuntimeConfig,
  type RuntimeConfig,
} from "./runtime-config";
import { attestTestRuntime } from "../security/test-runtime-boundary";

export interface ReadinessSnapshot {
  ok: boolean;
  database: "not-required" | "connected" | "unavailable";
  stage: RuntimeConfig["stage"];
  moduleRouting: RuntimeConfig["moduleRouting"];
  serviceRevision: string;
}

@Injectable()
export class RuntimeReadinessService implements OnApplicationShutdown {
  private readonly config = readRuntimeConfig();

  getRuntimeConfig(): RuntimeConfig {
    return this.config;
  }

  async attestTestDatabase(env: NodeJS.ProcessEnv = process.env) {
    if (this.config.stage !== "test") {
      throw new Error("TEST_RUNTIME_ATTESTATION_REJECTED");
    }

    const rows = await getPrismaClient().$queryRawUnsafe<Array<{ database_name: string }>>(
      "SELECT current_database() AS database_name",
    );
    const currentDatabase = rows[0]?.database_name;

    return {
      ok: true as const,
      attestation: "VERIFIED" as const,
      ...attestTestRuntime({
        databaseUrl: env.DATABASE_URL,
        runtimeStage: this.config.stage,
        serviceName: env.K_SERVICE,
        currentDatabase,
      }),
      serviceRevision: this.config.serviceRevision,
    };
  }

  async check(): Promise<ReadinessSnapshot> {
    if (!this.config.databaseRequired) {
      return {
        ok: true,
        database: "not-required",
        stage: this.config.stage,
        moduleRouting: this.config.moduleRouting,
        serviceRevision: this.config.serviceRevision,
      };
    }

    try {
      await getPrismaClient().$queryRawUnsafe("SELECT 1");

      return {
        ok: true,
        database: "connected",
        stage: this.config.stage,
        moduleRouting: this.config.moduleRouting,
        serviceRevision: this.config.serviceRevision,
      };
    } catch {
      return {
        ok: false,
        database: "unavailable",
        stage: this.config.stage,
        moduleRouting: this.config.moduleRouting,
        serviceRevision: this.config.serviceRevision,
      };
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await disconnectPrismaClient();
  }
}
