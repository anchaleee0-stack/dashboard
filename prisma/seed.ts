// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import {
  OFFICIAL_AMENITIES,
  OFFICIAL_ROOMS,
  ROLE_DEMO_USERS,
} from '../src/constants/master-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ข้อมูลเริ่มต้น ระบบจองห้องประชุม วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์...');

  // 1. Seed ห้องประชุมทั้ง 6 ห้องหลัก + อื่น ๆ
  for (const room of OFFICIAL_ROOMS) {
    await prisma.room.upsert({
      where: { code: room.code },
      update: {
        name: room.name,
        capacity: room.capacity,
        floor: room.floor,
        building: room.building,
        amenities: room.amenities,
        colorCode: room.colorCode,
        isCustomRoom: Boolean(room.isCustomRoom),
        isActive: room.isActive,
      },
      create: {
        id: room.id,
        code: room.code,
        name: room.name,
        capacity: room.capacity,
        floor: room.floor,
        building: room.building,
        amenities: room.amenities,
        colorCode: room.colorCode,
        isCustomRoom: Boolean(room.isCustomRoom),
        isActive: room.isActive,
      },
    });
  }

  // 2. Seed ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวก 7 รายการ
  for (let i = 0; i < OFFICIAL_AMENITIES.length; i++) {
    const am = OFFICIAL_AMENITIES[i];
    await prisma.amenity.upsert({
      where: { code: am.code },
      update: {
        name: am.name,
        requiresQuantity: Boolean(am.requiresQuantity),
        requiresCustomText: Boolean(am.requiresCustomText),
        sortOrder: i + 1,
      },
      create: {
        id: am.id,
        code: am.code,
        name: am.name,
        requiresQuantity: Boolean(am.requiresQuantity),
        requiresCustomText: Boolean(am.requiresCustomText),
        sortOrder: i + 1,
      },
    });
  }

  // 3. Seed ผู้ใช้งานทั้ง 4 บทบาทตามสายบังคับบัญชาจริง
  for (const u of ROLE_DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        prefix: u.prefix,
        name: u.fullName,
        position: u.position,
        department: u.department,
        phone: u.phone,
        role: u.role,
      },
      create: {
        id: u.id,
        email: u.email,
        prefix: u.prefix,
        name: u.fullName,
        position: u.position,
        department: u.department,
        phone: u.phone,
        role: u.role,
      },
    });
  }

  console.log('✅ Seed ข้อมูลห้องประชุม อุปกรณ์ และผู้ใช้งานทั้ง 4 Roles สำเร็จ!');
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
