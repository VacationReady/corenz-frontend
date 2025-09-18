// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.LOG_PRISMA === "true" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Simple connection guard to avoid "Engine is not yet connected" during hot reloads
let prismaConnectPromise: Promise<void> | null = null;

export async function ensurePrismaConnected() {
  if (!prismaConnectPromise) {
    prismaConnectPromise = prisma.$connect().catch((err) => {
      prismaConnectPromise = null;
      throw err;
    });
  }
  await prismaConnectPromise;
}

