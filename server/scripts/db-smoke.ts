// Quick connectivity + seed sanity check: npx tsx scripts/db-smoke.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  console.log('sizes:', await p.mdPetSize.count());
  console.log('statuses:', await p.mdBookingStatus.count());
  console.log('paymentStatuses:', await p.mdPaymentStatus.count());
  console.log('permissions:', await p.permission.count());
  console.log('roles:', await p.role.count());
  console.log('rolePermissions:', await p.rolePermission.count());
  console.log('settings:', await p.shopSetting.count());
  await p.$disconnect();
}
void main();
