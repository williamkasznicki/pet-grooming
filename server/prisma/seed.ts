// Seeds master data + RBAC rows. Idempotent (upsert by unique code/name).
// Convention reference: docs/RBAC.md
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/auth/password.util.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const petSizes = [
  { code: 'S', desc: 'Small (< 10 kg)', hexBgColorCode: '#DCFCE7', hexTextColorCode: '#166534' },
  { code: 'M', desc: 'Medium (10–25 kg)', hexBgColorCode: '#DBEAFE', hexTextColorCode: '#1E40AF' },
  { code: 'L', desc: 'Large (25–40 kg)', hexBgColorCode: '#FEF3C7', hexTextColorCode: '#92400E' },
  { code: 'XL', desc: 'Extra large (> 40 kg)', hexBgColorCode: '#FEE2E2', hexTextColorCode: '#991B1B' },
];

const bookingStatuses = [
  { code: 'CONFIRMED', desc: 'Booking confirmed', hexBgColorCode: '#DBEAFE', hexTextColorCode: '#1E40AF' },
  { code: 'IN_PROGRESS', desc: 'Grooming in progress', hexBgColorCode: '#FEF3C7', hexTextColorCode: '#92400E' },
  { code: 'COMPLETED', desc: 'Service completed', hexBgColorCode: '#DCFCE7', hexTextColorCode: '#166534' },
  { code: 'CANCELLED', desc: 'Booking cancelled', hexBgColorCode: '#F3F4F6', hexTextColorCode: '#374151' },
  { code: 'NO_SHOW', desc: 'Client did not show up', hexBgColorCode: '#FEE2E2', hexTextColorCode: '#991B1B' },
];

const paymentStatuses = [
  { code: 'UNPAID', desc: 'Payment pending (pay at shop)', hexBgColorCode: '#FEE2E2', hexTextColorCode: '#991B1B' },
  { code: 'PAID', desc: 'Paid at shop', hexBgColorCode: '#DCFCE7', hexTextColorCode: '#166534' },
];

const permissions = [
  { name: 'booking:create', displayName: 'Create Booking', group: 'Booking' },
  { name: 'booking:read', displayName: 'Read Booking', group: 'Booking' },
  { name: 'booking:update', displayName: 'Update Booking', group: 'Booking' },
  { name: 'booking:cancel', displayName: 'Cancel Booking', group: 'Booking' },
  { name: 'booking:delete', displayName: 'Delete Booking', group: 'Booking' },
  { name: 'booking:override', displayName: 'Override Price/Duration', group: 'Booking' },
  { name: 'pet:create', displayName: 'Create Pet', group: 'Pet' },
  { name: 'pet:read', displayName: 'Read Pet', group: 'Pet' },
  { name: 'pet:update', displayName: 'Update Pet', group: 'Pet' },
  { name: 'pet:delete', displayName: 'Delete Pet', group: 'Pet' },
  { name: 'service:manage', displayName: 'Manage Services & Tiers', group: 'Service' },
  { name: 'staff:manage', displayName: 'Manage Staff & Schedules', group: 'Staff' },
  { name: 'settings:manage', displayName: 'Manage Shop Settings', group: 'Settings' },
  { name: 'user:manage', displayName: 'Manage Users & Roles', group: 'Admin' },
  { name: 'report:read', displayName: 'View Reports', group: 'Admin' },
  { name: '*', displayName: 'Super Admin', group: 'Admin' },
];

const roles: { name: string; group: string; permissions: string[] }[] = [
  { name: 'Admin', group: 'Admin', permissions: ['*'] },
  {
    name: 'Groomer',
    group: 'Staff',
    permissions: ['booking:read', 'booking:update', 'booking:cancel', 'booking:override', 'pet:read'],
  },
  {
    name: 'Client',
    group: 'Client',
    permissions: ['booking:create', 'booking:read', 'booking:cancel', 'pet:create', 'pet:read', 'pet:update'],
  },
];

const shopSettings: { key: string; value: unknown }[] = [
  { key: 'shop.hours', value: { openMin: 9 * 60, closeMin: 18 * 60 } },
  { key: 'booking.cancelCutoffHours', value: 24 },
  { key: 'booking.slotStepMin', value: 30 },
  { key: 'reminder.hoursBefore', value: 24 },
];

async function main() {
  for (const s of petSizes) {
    await prisma.mdPetSize.upsert({ where: { code: s.code }, update: s, create: s });
  }
  for (const s of bookingStatuses) {
    await prisma.mdBookingStatus.upsert({ where: { code: s.code }, update: s, create: s });
  }
  for (const s of paymentStatuses) {
    await prisma.mdPaymentStatus.upsert({ where: { code: s.code }, update: s, create: s });
  }

  for (const p of permissions) {
    await prisma.permission.upsert({ where: { name: p.name }, update: p, create: p });
  }

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { group: r.group },
      create: { name: r.name, group: r.group },
    });
    for (const permName of r.permissions) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { name: permName } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  for (const s of shopSettings) {
    await prisma.shopSetting.upsert({
      where: { key: s.key },
      update: {}, // never clobber admin-edited values on reseed
      create: { key: s.key, value: s.value as object },
    });
  }

  // Default admin (dev bootstrap). Override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@petcrm.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // never overwrite an existing admin's password on reseed
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      name: 'Shop Admin',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`Seed complete: master data, permissions, roles, default settings, admin (${adminEmail}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
