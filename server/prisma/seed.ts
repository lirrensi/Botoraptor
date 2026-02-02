import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Select database URL based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const dbUrl = isProduction
    ? process.env.DATABASE_URL_PROD!
    : process.env.DATABASE_URL_DEV!;

console.log(`[Seed] Using ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} database: ${dbUrl}`);

const adapter = new PrismaBetterSqlite3(dbUrl);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('Seeding database...')
  // Add your seeding logic here
  console.log('Seeding completed.')
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })