const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tb_projects.findMany().then(res => console.log('Projects:', res)).catch(console.error).finally(()=>prisma.$disconnect());
