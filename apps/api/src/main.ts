import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { readRuntimeConfig } from "./runtime/runtime-config";

async function bootstrap(): Promise<void> {
  readRuntimeConfig();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 8080);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
