import "dotenv/config";
import type { PrismaConfig } from "prisma";

/**
 * Prisma CLI config (seed etc.). DATABASE_URL loaded from .env via dotenv above.
 * See https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
} satisfies PrismaConfig;
