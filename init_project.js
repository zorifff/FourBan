const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const firstUser = await prisma.tb_users.findFirst(); 
  if(!firstUser) {
    console.log("No user found");
    return; 
  }
  
  let p = await prisma.tb_projects.findFirst({where: {nama_project: 'Web Recipeat'}}); 
  if(!p) { 
    p = await prisma.tb_projects.create({ 
      data: { 
        nama_project: 'Web Recipeat', 
        deskripsi: 'Existing Kanban Board', 
        created_by: firstUser.id_user, 
        members: { 
          create: { 
            id_user: firstUser.id_user, 
            role: 'admin' 
          } 
        } 
      }
    }); 
  } 
  
  await prisma.tb_tasks.updateMany({ 
    where: { id_project: null }, 
    data: { id_project: p.id_project } 
  }); 
  
  console.log('Assigned existing tasks to Web Recipeat, project ID: ' + p.id_project); 
} 

main()
  .catch(console.error)
  .finally(()=>prisma.$disconnect());
