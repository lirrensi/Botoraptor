import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL!
const adapter = new PrismaBetterSqlite3(dbUrl)
const prisma = new PrismaClient({ adapter })

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