/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  PrismaClient,
  Role,
  Provider,
  UserStatus,
  BookStatus,
  PaymentMethod,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bookstore.com' },
    update: {},
    create: {
      email: 'admin@bookstore.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      provider: Provider.EMAIL,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('👤 Created admin user');

  // Create sample publication
  const publication = await prisma.publication.upsert({
    where: { slug: 'penguin-random-house' },
    update: {},
    create: {
      name: 'Penguin Random House',
      slug: 'penguin-random-house',
      description: "World's largest trade book publisher",
      status: BookStatus.PUBLISHED,
    },
  });
  console.log('🏢 Created publication');

  // Create sample subject
  const subject = await prisma.subject.upsert({
    where: { slug: 'fiction' },
    update: {},
    create: {
      name: 'Fiction',
      slug: 'fiction',
      description: 'Fiction books and novels',
    },
  });
  console.log('📚 Created subject');

  // Create sample book
  const book = await prisma.book.upsert({
    where: { slug: 'sample-book' },
    update: {},
    create: {
      title: 'Sample Book',
      slug: 'sample-book',
      shortDescription: 'A sample book for testing',
      description: 'This is a detailed description of the sample book.',
      isbn: '978-0-123456-78-9',
      price: 29.99,
      discountPrice: 24.99,
      publicationDate: new Date('2024-01-01'),
      edition: '1st Edition',
      language: 'English',
      stock: 100,
      status: BookStatus.PUBLISHED,
      publicationId: publication.id,
      subjectId: subject.id,
    },
  });
  console.log('📖 Created book');

  // Create sample banner
  const banner = await prisma.banner.create({
    data: {
      title: 'Welcome to Bookstore',
      subtitle: 'Discover amazing books',
      image: 'https://example.com/banner.jpg',
      buttonText: 'Shop Now',
      buttonUrl: '/books',
      displayOrder: 1,
      status: BookStatus.PUBLISHED,
    },
  });
  console.log('🎨 Created banner');

  // Create sample settings
  const settings = [
    { key: 'site_name', value: 'Bookstore CMS' },
    { key: 'currency', value: 'USD' },
    { key: 'tax_rate', value: '0' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }
  console.log('⚙️ Created settings');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
