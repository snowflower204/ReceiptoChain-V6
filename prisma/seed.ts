import { config } from "dotenv";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function getDatabaseUrl(): string {
  const value =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("Database URL is not configured");
  }

  return value;
}

const databaseUrl = getDatabaseUrl();
const adminEmail = getRequiredEnvironmentVariable(
  "ADMIN_EMAIL"
).toLowerCase();
const adminPassword = getRequiredEnvironmentVariable(
  "ADMIN_PASSWORD"
);

if (adminPassword.length < 12) {
  throw new Error(
    "ADMIN_PASSWORD must contain at least 12 characters"
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const passwordHash: string = await bcrypt.hash(
    adminPassword,
    12
  );

  const user = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      passwordHash,
    },
    create: {
      email: adminEmail,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`User ready: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });