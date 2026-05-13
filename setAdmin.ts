import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.tb_users.updateMany({
    where: { email: 'zhorif@gmail.com' },
    data: { role: 'admin' },
  });
  console.log("Berhasil mengubah role zhorif@gmail.com menjadi admin");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
