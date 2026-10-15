import { PrismaClient } from "@prisma/client";

let prismaSingleton: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  prismaSingleton ??= new PrismaClient();
  return prismaSingleton;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!prismaSingleton) {
    return;
  }

  await prismaSingleton.$disconnect();
  prismaSingleton = null;
}
