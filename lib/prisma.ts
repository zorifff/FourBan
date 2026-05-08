import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const prismaClientSingleton = () => {
  // 1. Inisialisasi adapter Neon menggunakan URL dari .env
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL as string
  });
  
  // 2. Masukkan adapter ke dalam constructor PrismaClient
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;