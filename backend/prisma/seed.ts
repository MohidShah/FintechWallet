import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { encryptField } from '../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing Database Seeds (System Admin & Demo Customers)...');

  // Hash default password using Argon2id (W3 Control)
  const defaultPasswordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  // 1. Ensure System Administrator Account Exists
  const adminCnic = encryptField('42101-9823412-1');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@securewallet.io' },
    update: { cnic: adminCnic },
    create: {
      id: 'usr-admin-001',
      fullName: 'Security Officer Admin',
      email: 'admin@securewallet.io',
      username: 'admin_officer',
      cnic: adminCnic,
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      wallet: {
        create: {
          id: 'w-admin-001',
          accountNumber: 'PK99SWAL10000001',
          balance: 100000.00,
        },
      },
    },
  });

  // 2. Ensure Demo Customer Account 1 (Ali) Exists
  const aliCnic = encryptField('42101-1234567-1');
  const customer1 = await prisma.user.upsert({
    where: { email: 'ali@securewallet.io' },
    update: { cnic: aliCnic },
    create: {
      id: 'usr-ali-101',
      fullName: 'Ali Hassan',
      email: 'ali@securewallet.io',
      username: 'ali_hassan',
      cnic: aliCnic,
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      wallet: {
        create: {
          id: 'w-ali-101',
          accountNumber: 'PK99SWAL10000002',
          balance: 1000000.00,
        },
      },
    },
  });

  // 3. Ensure Demo Customer Account 2 (Sara) Exists
  const saraCnic = encryptField('42101-7654321-2');
  const customer2 = await prisma.user.upsert({
    where: { email: 'sara@securewallet.io' },
    update: { cnic: saraCnic },
    create: {
      id: 'usr-sara-102',
      fullName: 'Sara Khan',
      email: 'sara@securewallet.io',
      username: 'sara_khan',
      cnic: saraCnic,
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      wallet: {
        create: {
          id: 'w-sara-102',
          accountNumber: 'PK99SWAL10000003',
          balance: 500000.00,
        },
      },
    },
  });

  console.log('✅ Database Seeding Complete!');
  console.log(' - Admin Account:', admin.email);
  console.log(' - Demo Customer 1:', customer1.email, '(IBAN: PK99SWAL10000002)');
  console.log(' - Demo Customer 2:', customer2.email, '(IBAN: PK99SWAL10000003)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
