// src/services/reminder.cron.ts
import { prisma } from '@/lib/prisma';
import { emitRealtimeEvent, SOCKET_EVENTS } from '@/lib/socket-server';

const REMINDER_WINDOW_MINUTES = 15;
const CHECK_INTERVAL_MS = 60 * 1000; // รันตรวจสอบทุกๆ 1 นาที

let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * ตรวจสอบการประชุมที่กำลังจะเริ่มภายใน 15 นาทีข้างหน้า
 * และส่งแจ้งเตือนแบบ Real-time ผ่าน Socket.io + บันทึกลงตาราง Notification
 */
export async function processUpcomingMeetingReminders() {
  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(
      now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000
    );

    // 1. ค้นหารายการจองที่สถานะ APPROVED, ยังไม่เคยส่งแจ้งเตือน (reminderSent = false)
    // และมีเวลาเริ่มอยู่ระหว่าง ปัจจุบัน ถึง อีก 15 นาทีข้างหน้า
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'APPROVED',
        reminderSent: false,
        startTime: {
          gt: now,
          lte: fifteenMinutesFromNow,
        },
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    for (const booking of upcomingBookings) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((booking.startTime.getTime() - now.getTime()) / (1000 * 60))
      );

      const message = `อีก ${minutesLeft} นาทีจะเริ่มการประชุม "${booking.title}" ที่ห้อง ${booking.room.name} (ชั้น ${booking.room.floor})`;

      // 2. อัปเดตสถานะ reminderSent = true และสร้าง Notification ใน Transaction เดียวกัน
      const [, notification] = await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        }),
        prisma.notification.create({
          data: {
            userId: booking.userId,
            bookingId: booking.id,
            type: 'MEETING_REMINDER',
            message,
          },
        }),
      ]);

      // 3. ส่ง Event แจ้งเตือนผ่าน Socket.io ไปยังไคลเอนต์
      const reminderPayload = {
        bookingId: booking.id,
        title: booking.title,
        roomName: booking.room.name,
        floor: booking.room.floor,
        startTime: booking.startTime.toISOString(),
        minutesLeft,
        notificationId: notification.id,
      };

      // ส่งเข้า Channel ของผู้จองโดยตรง และ Broadcast ไปหน้าจอหลัก
      emitRealtimeEvent(
        SOCKET_EVENTS.MEETING_REMINDER,
        reminderPayload,
        `user:${booking.userId}`
      );
      emitRealtimeEvent(SOCKET_EVENTS.MEETING_REMINDER, reminderPayload);
    }
  } catch (error) {
    console.error('[Reminder Cron] Error checking upcoming meetings:', error);
  }
}

/**
 * เริ่มต้น Background Scheduler สำหรับแจ้งเตือนก่อนเริ่มประชุม 15 นาที
 */
export function startMeetingReminderScheduler() {
  if (schedulerTimer) return;

  console.log(
    `[Reminder Scheduler] Started (checking every ${CHECK_INTERVAL_MS / 1000}s for meetings within ${REMINDER_WINDOW_MINUTES} mins)`
  );

  // รันตรวจสอบทันที 1 ครั้งตอนเปิดเซิร์ฟเวอร์ และตั้งเวลาทำงานซ้ำทุก 1 นาที
  processUpcomingMeetingReminders();
  schedulerTimer = setInterval(processUpcomingMeetingReminders, CHECK_INTERVAL_MS);
}
