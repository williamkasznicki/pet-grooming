/**
 * DEV-ONLY mock data. Destructive: wipes all transactional rows (bookings,
 * holds, chats, email logs) and every non-admin user, then seeds groomers,
 * clients + pets, and a spread of bookings across the past few months and the
 * coming weeks so the dashboard charts (day/week/month/year) have something to
 * show. Never run against production.
 *
 * Run after the base seed:  npm run db:seed && npm run db:seed:mock
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/utils/password.util.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const BKK_OFFSET_H = 7; // Asia/Bangkok = UTC+7 (no DST)
const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 18 * 60;

/** Build a UTC instant for a given Bangkok wall-clock time on `day`. */
function bkk(day: Date, hour: number, minute: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - BKK_OFFSET_H, minute));
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

const groomers = [
  { email: 'ploy@petcrm.local', name: 'Ploy Srisai', displayName: 'Ploy', bio: 'Senior stylist — poodles and doodles.' },
  { email: 'nattapong@petcrm.local', name: 'Nattapong Wong', displayName: 'Boss', bio: 'Large breeds and de-shedding specialist.' },
  { email: 'mali@petcrm.local', name: 'Mali Chan', displayName: 'Mali', bio: 'Gentle with anxious and senior pets.' },
];

const clients = [
  { email: 'somchai@example.com', name: 'Somchai P.', phone: '0810000001' },
  { email: 'suda@example.com', name: 'Suda K.', phone: '0810000002' },
  { email: 'anan@example.com', name: 'Anan T.', phone: '0810000003' },
  { email: 'pim@example.com', name: 'Pim R.', phone: '0810000004' },
  { email: 'krit@example.com', name: 'Krit S.', phone: '0810000005' },
  { email: 'nok@example.com', name: 'Nok W.', phone: '0810000006' },
  { email: 'tae@example.com', name: 'Tae L.', phone: '0810000007' },
  { email: 'fah@example.com', name: 'Fah M.', phone: '0810000008' },
];

const petBlueprints = [
  { name: 'Mochi', breed: 'Toy Poodle', weightKg: '4.2' },
  { name: 'Coco', breed: 'Shih Tzu', weightKg: '6.5' },
  { name: 'Max', breed: 'Golden Retriever', weightKg: '31.0' },
  { name: 'Luna', breed: 'Pomeranian', weightKg: '3.1' },
  { name: 'Bruno', breed: 'Labrador', weightKg: '28.5' },
  { name: 'Daisy', breed: 'Beagle', weightKg: '11.0' },
  { name: 'Rocky', breed: 'Siberian Husky', weightKg: '24.0' },
  { name: 'Bella', breed: 'Corgi', weightKg: '13.5' },
  { name: 'Simba', breed: 'Maine Coon', weightKg: '7.0' },
  { name: 'Ginger', breed: 'Persian Cat', weightKg: '4.8' },
  { name: 'Thor', breed: 'German Shepherd', weightKg: '38.0' },
  { name: 'Peanut', breed: 'Chihuahua', weightKg: '2.4' },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { userRoles: { some: { role: { name: 'Admin' } } } }, select: { id: true } });

  console.log('Cleaning transactional data…');
  await prisma.bookingStatusEvent.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.slotHold.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatSession.deleteMany({});
  await prisma.emailLog.deleteMany({});
  // Non-admin users cascade to pets, staff profiles, working hours, tokens.
  await prisma.user.deleteMany({ where: { userRoles: { none: { role: { name: 'Admin' } } } } });

  // Ensure the cancellation cutoff matches the "at least 1 hour" copy.
  await prisma.shopSetting.upsert({
    where: { key: 'booking.cancelCutoffHours' },
    update: { value: 1 },
    create: { key: 'booking.cancelCutoffHours', value: 1 },
  });

  const [groomerRole, clientRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: 'Groomer' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'Client' } }),
  ]);
  const sizes = await prisma.mdPetSize.findMany({ select: { id: true, minWeightKg: true, maxWeightKg: true } });
  const services = await prisma.service.findMany({
    where: { deletedAt: null },
    select: { id: true, tiers: { select: { sizeId: true, durationMin: true, priceThb: true } } },
  });
  const statuses = await prisma.mdBookingStatus.findMany({ select: { id: true, code: true } });
  const payments = await prisma.mdPaymentStatus.findMany({ select: { id: true, code: true } });
  const statusId = (code: string) => statuses.find((s) => s.code === code)!.id;
  const paymentId = (code: string) => payments.find((s) => s.code === code)!.id;

  const sizeForWeight = (weightKg: string): number => {
    const w = Number(weightKg);
    const band = sizes.find(
      (s) => w >= Number(s.minWeightKg) && (s.maxWeightKg === null || w < Number(s.maxWeightKg)),
    );
    return (band ?? sizes[0]!).id;
  };

  console.log('Seeding groomers…');
  const passwordHash = await hashPassword('password123');
  const staffProfiles: { id: string }[] = [];
  for (const g of groomers) {
    const user = await prisma.user.create({
      data: {
        email: g.email,
        passwordHash,
        name: g.name,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: groomerRole.id } },
        staffProfile: { create: { displayName: g.displayName, bio: g.bio, active: true } },
      },
      select: { staffProfile: { select: { id: true } } },
    });
    const profileId = user.staffProfile!.id;
    staffProfiles.push({ id: profileId });
    // Working hours: Tue–Sun (weekday 2..6, 0), full open window.
    for (const weekday of [0, 2, 3, 4, 5, 6]) {
      await prisma.workingHours.create({ data: { staffId: profileId, weekday, startMin: OPEN_MIN, endMin: CLOSE_MIN } });
    }
  }

  console.log('Seeding clients + pets…');
  const petPool: { id: string; ownerId: string; sizeId: number }[] = [];
  let petIdx = 0;
  for (const c of clients) {
    const petCount = 1 + (chance(0.5) ? 1 : 0);
    const owner = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash,
        name: c.name,
        phone: c.phone,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: clientRole.id } },
      },
      select: { id: true },
    });
    for (let i = 0; i < petCount; i++) {
      const bp = petBlueprints[petIdx % petBlueprints.length]!;
      petIdx++;
      const pet = await prisma.pet.create({
        data: {
          ownerId: owner.id,
          name: bp.name,
          breed: bp.breed,
          weightKg: bp.weightKg,
          sizeId: sizeForWeight(bp.weightKg),
        },
        select: { id: true, ownerId: true, sizeId: true },
      });
      petPool.push(pet);
    }
  }

  console.log('Seeding bookings across time…');
  const confirmedId = statusId('CONFIRMED');
  let created = 0;
  // Past 120 days + next 14. Each active day, each groomer runs a sequential
  // chain of bookings from opening so no groomer overlaps itself.
  for (let dayOffset = -120; dayOffset <= 14; dayOffset++) {
    const day = new Date();
    day.setUTCHours(12, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    const weekday = day.getUTCDay();
    if (weekday === 1) continue; // shop closed Mondays (no working hours)
    if (dayOffset < 0 && !chance(0.65)) continue; // sparser history
    if (dayOffset > 0 && !chance(0.5)) continue; // lighter future

    for (const staff of staffProfiles) {
      let cursorMin = OPEN_MIN + pick([0, 0, 30]); // small varied start
      const chainLen = 1 + Math.floor(Math.random() * 4); // 1..4 per groomer/day
      for (let n = 0; n < chainLen; n++) {
        const service = pick(services);
        const pet = pick(petPool);
        const tier = service.tiers.find((tr) => tr.sizeId === pet.sizeId);
        if (!tier) continue;
        if (cursorMin + tier.durationMin > CLOSE_MIN) break;

        const startsAt = bkk(day, Math.floor(cursorMin / 60), cursorMin % 60);
        const endsAt = new Date(startsAt.getTime() + tier.durationMin * 60_000);

        // Status/payment by when the booking sits relative to now.
        let code = 'CONFIRMED';
        let payCode = 'UNPAID';
        if (dayOffset < 0) {
          if (chance(0.1)) code = 'CANCELLED';
          else if (chance(0.08)) code = 'NO_SHOW';
          else {
            code = 'COMPLETED';
            payCode = 'PAID';
          }
        } else if (dayOffset === 0 && n === 0) {
          code = 'IN_PROGRESS';
        }
        if (code === 'NO_SHOW' && chance(0.5)) payCode = 'PAID'; // some no-show fees collected

        await prisma.booking.create({
          data: {
            clientId: pet.ownerId,
            petId: pet.id,
            serviceId: service.id,
            staffId: staff.id,
            startsAt,
            endsAt,
            priceThb: tier.priceThb,
            durationMin: tier.durationMin,
            statusId: statusId(code),
            paymentStatusId: paymentId(payCode),
            statusEvents: {
              create: { fromStatusId: null, toStatusId: confirmedId, changedById: admin?.id ?? null },
            },
          },
        });
        created++;
        cursorMin += tier.durationMin + pick([0, 0, 15, 30]); // gap between appointments
      }
    }
  }

  console.log(
    `Mock seed complete: ${groomers.length} groomers, ${clients.length} clients, ${petPool.length} pets, ${created} bookings.`,
  );
  console.log('All mock users share the password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
