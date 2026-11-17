import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/agenda_shows?schema=public";

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });