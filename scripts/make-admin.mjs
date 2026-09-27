import { PrismaClient } from '@prisma/client';
const email=process.argv[2]?.trim().toLowerCase();
if(!email){console.error('Uso: npm run admin -- seu-email@exemplo.com');process.exit(1);}
const prisma=new PrismaClient();
try{const user=await prisma.user.findUnique({where:{email}});if(!user)throw new Error('Cadastre primeiro a sua conta pela interface.');await prisma.user.update({where:{id:user.id},data:{role:'ADMIN',suspended:false}});console.log(`Acesso administrativo concedido a ${email}. Saia e entre novamente.`);}catch(e){console.error(e.message);process.exitCode=1;}finally{await prisma.$disconnect();}
