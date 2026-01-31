import 'dotenv/config'
import { PrismaClient } from './generated/client.ts'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// The database URL is expected to be in the format: file:./db/dev.db
const dbUrl = process.env.DATABASE_URL!
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

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
