import { PrismaClient as PrismaClientBase } from "@/prisma/generated/prisma/client";

type PrismaClientInstance = InstanceType<typeof PrismaClientBase>;

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClientInstance;
  process?: { env?: Record<string, string | undefined> };
};

const PrismaClientConstructor = PrismaClientBase as unknown as {
  new (): PrismaClientInstance;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

export const prisma: PrismaClientInstance =
  globalWithPrisma.prisma ?? new PrismaClientConstructor();

if (globalWithPrisma.process?.env?.NODE_ENV !== "production") {
  globalWithPrisma.prisma = prisma;
}
