import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Select database URL based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const dbUrl = isProduction
    ? process.env.DATABASE_URL_PROD!
    : process.env.DATABASE_URL_DEV!;

console.log(`[Prisma Client] Using ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} database: ${dbUrl}`);

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

export async function connectPrisma() {
    try {
        await prisma.$connect();
    } catch (e) {
        // ignore connect errors here; operations will fail loudly if needed
        console.error("Prisma connect error", e);
    }
}

export async function disconnectPrisma() {
    try {
        await prisma.$disconnect();
    } catch (e) {
        console.error("Prisma disconnect error", e);
    }
}

export default prisma;
