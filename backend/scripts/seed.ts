import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de la base de données...');

  // Créer un utilisateur admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@verqo.com' },
    update: {},
    create: {
      email: 'admin@verqo.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Verqo',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('✅ Utilisateur admin créé:', admin.email);

  // Créer un utilisateur développeur
  const devPassword = await bcrypt.hash('dev123', 12);
  const dev = await prisma.user.upsert({
    where: { email: 'dev@verqo.com' },
    update: {},
    create: {
      email: 'dev@verqo.com',
      password: devPassword,
      firstName: 'Developer',
      lastName: 'Verqo',
      role: UserRole.DEV,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('✅ Utilisateur développeur créé:', dev.email);

  // Créer un utilisateur client
  const clientPassword = await bcrypt.hash('client123', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@verqo.com' },
    update: {},
    create: {
      email: 'client@verqo.com',
      password: clientPassword,
      firstName: 'Client',
      lastName: 'Verqo',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('✅ Utilisateur client créé:', client.email);

  // Créer quelques projets de démonstration
  const demoProject1 = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      name: 'Application E-commerce',
      description: 'Plateforme de vente en ligne avec système de paiement intégré',
      githubUrl: 'https://github.com/verqo/ecommerce-app',
      stagingUrl: 'https://staging-ecommerce.verqo.app',
      ownerId: client.id,
    },
  });
  console.log('✅ Projet démo créé:', demoProject1.name);

  const demoProject2 = await prisma.project.upsert({
    where: { id: 'demo-project-2' },
    update: {},
    create: {
      id: 'demo-project-2',
      name: 'API REST Blog',
      description: 'API backend pour un système de blog avec authentification',
      githubUrl: 'https://github.com/verqo/blog-api',
      ownerId: client.id,
    },
  });
  console.log('✅ Projet démo créé:', demoProject2.name);

  // Assigner le développeur au premier projet
  await prisma.projectDeveloper.upsert({
    where: {
      projectId_userId: {
        projectId: demoProject1.id,
        userId: dev.id,
      },
    },
    update: {},
    create: {
      projectId: demoProject1.id,
      userId: dev.id,
    },
  });
  console.log('✅ Développeur assigné au projet:', demoProject1.name);

  console.log('🎉 Seeding terminé avec succès!');
  console.log('\n📋 Comptes de test créés:');
  console.log('👑 Admin: admin@verqo.com / admin123');
  console.log('🔧 Dev: dev@verqo.com / dev123');
  console.log('👤 Client: client@verqo.com / client123');
  console.log('\n🚀 Projets de démonstration créés:');
  console.log('📦 Application E-commerce (avec dev assigné)');
  console.log('📦 API REST Blog');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
