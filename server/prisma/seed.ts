// Seeds master data + RBAC rows. Idempotent (upsert by unique code/name).
// Convention reference: docs/RBAC.md
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/utils/password.util.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient( {
  adapter: new PrismaPg( { connectionString: process.env.DATABASE_URL! } ),
} );

/** Weight bands: a pet belongs to the band where min <= weightKg < max (null max = open-ended). */
const petSizes = [
  { code: 'S', minWeightKg: '0', maxWeightKg: '10', desc: 'Small (< 10 kg)', hexBgColorCode: '#DCFCE7', hexTextColorCode: '#166534' },
  { code: 'M', minWeightKg: '10', maxWeightKg: '25', desc: 'Medium (10–25 kg)', hexBgColorCode: '#DBEAFE', hexTextColorCode: '#1E40AF' },
  { code: 'L', minWeightKg: '25', maxWeightKg: '40', desc: 'Large (25–40 kg)', hexBgColorCode: '#FEF3C7', hexTextColorCode: '#92400E' },
  { code: 'XL', minWeightKg: '40', maxWeightKg: null, desc: 'Extra large (40 kg+)', hexBgColorCode: '#FEE2E2', hexTextColorCode: '#991B1B' },
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
  { name: 'Admin', group: 'Admin', permissions: [ '*' ] },
  {
    name: 'Groomer',
    group: 'Staff',
    permissions: [ 'booking:read', 'booking:update', 'booking:cancel', 'booking:override', 'pet:read' ],
  },
  {
    name: 'Client',
    group: 'Client',
    permissions: [ 'booking:create', 'booking:read', 'booking:cancel', 'pet:create', 'pet:read', 'pet:update' ],
  },
];

/** Starter services with per-size tiers (S/M/L/XL) — admin-editable afterwards. */
const services: { name: string; description: string; nameTh: string; descriptionTh: string; tiers: { size: string; priceThb: string; durationMin: number }[] }[] = [
  {
    name: 'Bath & Brush',
    description: 'Bath, blow-dry, and brush-out',
    nameTh: 'อาบน้ำ & แปรงขน',
    descriptionTh: 'อาบน้ำ เป่าแห้ง และแปรงขนให้ฟูสวย',
    tiers: [
      { size: 'S', priceThb: '350.00', durationMin: 45 },
      { size: 'M', priceThb: '450.00', durationMin: 60 },
      { size: 'L', priceThb: '550.00', durationMin: 75 },
      { size: 'XL', priceThb: '650.00', durationMin: 90 },
    ],
  },
  {
    name: 'Full Groom',
    description: 'Bath, haircut, nails, ears, and finishing',
    nameTh: 'กรูมมิ่งครบชุด',
    descriptionTh: 'อาบน้ำ ตัดขน ตัดเล็บ เช็ดหู และตกแต่งทรง',
    tiers: [
      { size: 'S', priceThb: '690.00', durationMin: 90 },
      { size: 'M', priceThb: '790.00', durationMin: 105 },
      { size: 'L', priceThb: '890.00', durationMin: 120 },
      { size: 'XL', priceThb: '990.00', durationMin: 150 },
    ],
  },
  {
    name: 'Nail Trim',
    description: 'Nail clipping and filing',
    nameTh: 'ตัดเล็บ',
    descriptionTh: 'ตัดและตะไบเล็บอย่างอ่อนโยน',
    tiers: [
      { size: 'S', priceThb: '150.00', durationMin: 15 },
      { size: 'M', priceThb: '150.00', durationMin: 15 },
      { size: 'L', priceThb: '200.00', durationMin: 30 },
      { size: 'XL', priceThb: '200.00', durationMin: 30 },
    ],
  },
];

const shopSettings: { key: string; value: unknown }[] = [
  { key: 'shop.timezone', value: 'Asia/Bangkok' },
  { key: 'shop.hours', value: { openMin: 9 * 60, closeMin: 18 * 60 } },
  { key: 'booking.cancelCutoffHours', value: 2 },
  { key: 'booking.slotStepMin', value: 30 },
  { key: 'booking.minNoticeMin', value: 60 },
  { key: 'reminder.hoursBefore', value: 24 },
];

async function main () {
  for ( const s of petSizes ) {
    await prisma.mdPetSize.upsert( { where: { code: s.code }, update: s, create: s } );
  }
  for ( const s of bookingStatuses ) {
    await prisma.mdBookingStatus.upsert( { where: { code: s.code }, update: s, create: s } );
  }
  for ( const s of paymentStatuses ) {
    await prisma.mdPaymentStatus.upsert( { where: { code: s.code }, update: s, create: s } );
  }

  for ( const p of permissions ) {
    await prisma.permission.upsert( { where: { name: p.name }, update: p, create: p } );
  }

  for ( const r of roles ) {
    const role = await prisma.role.upsert( {
      where: { name: r.name },
      update: { group: r.group },
      create: { name: r.name, group: r.group },
    } );
    for ( const permName of r.permissions ) {
      const perm = await prisma.permission.findUniqueOrThrow( { where: { name: permName } } );
      await prisma.rolePermission.upsert( {
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      } );
    }
  }

  // Services + tiers. Service.name isn't unique in the schema, so match by name
  // (create once, never clobber admin edits); tiers upsert on serviceId+sizeId.
  for ( const svc of services ) {
    const existing = await prisma.service.findFirst( { where: { name: svc.name, deletedAt: null }, select: { id: true } } );
    const service = existing ?? ( await prisma.service.create( {
      data: { name: svc.name, description: svc.description, nameTh: svc.nameTh, descriptionTh: svc.descriptionTh },
    } ) );
    // Fill Thai strings on rows that predate service_i18n — only when never set,
    // so admin edits survive reseeds
    if ( existing ) {
      await prisma.service.updateMany( {
        where: { id: existing.id, nameTh: null },
        data: { nameTh: svc.nameTh, descriptionTh: svc.descriptionTh },
      } );
    }
    for ( const tier of svc.tiers ) {
      const size = await prisma.mdPetSize.findUniqueOrThrow( { where: { code: tier.size }, select: { id: true } } );
      await prisma.serviceTier.upsert( {
        where: { serviceId_sizeId: { serviceId: service.id, sizeId: size.id } },
        update: {}, // keep admin-edited prices on reseed
        create: { serviceId: service.id, sizeId: size.id, priceThb: tier.priceThb, durationMin: tier.durationMin },
      } );
    }
  }

  for ( const s of shopSettings ) {
    await prisma.shopSetting.upsert( {
      where: { key: s.key },
      update: {}, // never clobber admin-edited values on reseed
      create: { key: s.key, value: s.value as object },
    } );
  }

  // Default admin (dev bootstrap). Override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
  const adminEmail = ( process.env.SEED_ADMIN_EMAIL ?? 'admin@petcrm.local' ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  const adminRole = await prisma.role.findUniqueOrThrow( { where: { name: 'Admin' } } );
  const admin = await prisma.user.upsert( {
    where: { email: adminEmail },
    update: {}, // never overwrite an existing admin's password on reseed
    create: {
      email: adminEmail,
      passwordHash: await hashPassword( adminPassword ),
      name: 'Shop Admin',
    },
  } );
  await prisma.userRole.upsert( {
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  } );

  console.log( `Seed complete: master data, permissions, roles, default settings, admin (${ adminEmail }).` );
}

main()
  .catch( ( e ) => {
    console.error( e );
    process.exitCode = 1;
  } )
  .finally( () => prisma.$disconnect() );
