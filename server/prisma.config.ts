import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Select database URL based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const dbUrl = isProduction
    ? env("DATABASE_URL_PROD")
    : env("DATABASE_URL_DEV");

console.log(`[Prisma] Using ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} database: ${dbUrl}`);

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        url: dbUrl,
    },
});