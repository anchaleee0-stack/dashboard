// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createBookingSchema } from '@/lib/validations/booking';
import {
  BookingConflictError,
  BookingRuleError,
  createBookingWithLock,
  getInMemoryBookings,
} from '@/services/booking.service';
import { PREFIX_MAP } from '@/constants/master-data';
import { emitRealtimeEvent, SOCKET_EVENTS } from '@/lib/socket-server';
import {
  appendBookingToGoogleSheet,
  GOOGLE_WORKSPACE_CONFIG,
} from '@/services/google-sync.service';
import { BookingItemDTO, BookingWorkflowStatus } from '@/types/booking';

/**
 * GET /api/bookings?start=...&end=...&roomId=...&status=...
 * ดึงรายการคำขอและตารางการจองห้องประชุมสำหรับ Calendar และ Approval Queue
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const roomId = searchParams.get('roomId');
    const statusParam = searchParams.get('status');

    if (!process.env.DATABASE_URL) {
      let bookings = [...getInMemoryBookings()];

      if (startParam && endParam) {
        const s = new Date(startParam);
        const e = new Date(endParam);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          bookings = bookings.filter(
            (b) => new Date(b.startTime) < e && new Date(b.endTime) > s
          );
        }
      }

      if (roomId && roomId !== 'ALL') {
        bookings = bookings.filter(
          (b) => b.roomId === roomId || b.roomIds?.includes(roomId)
        );
      }

      if (statusParam && statusParam !== 'ALL') {
        bookings = bookings.filter((b) => b.status === statusParam);
      }

      return NextResponse.json({ data: bookings }, { status: 200 });
    }

    const whereClause: Prisma.BookingWhereInput = {};

    if (startParam && endParam) {
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'พารามิเตอร์ start หรือ end ไม่ใช่รูปแบบวันที่ที่ถูกต้อง' },
          { status: 400 }
        );
      }
      whereClause.AND = [
        { startTime: { lt: endDate } },
        { endTime: { gt: startDate } },
      ];
    }

    if (roomId && roomId !== 'ALL') {
      whereClause.OR = [
        { roomId },
        { bookingRooms: { some: { roomId } } },
      ];
    }

    if (statusParam && statusParam !== 'ALL') {
      whereClause.status = statusParam as BookingWorkflowStatus;
    }

    const dbBookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: true,
        bookingRooms: { include: { room: true } },
        bookingAmenities: { include: { amenity: true } },
        approvals: {
          include: { approver: true },
          orderBy: { actedAt: 'asc' },
        },
        user: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const formatted: BookingItemDTO[] = dbBookings.map((b) => ({
      id: b.id,
      documentNo: b.documentNo,
      roomId: b.roomId,
      roomIds:
        b.bookingRooms.length > 0
          ? b.bookingRooms.map((br) => br.roomId)
          : [b.roomId],
      rooms: b.bookingRooms.map((br) => ({
        id: br.room.id,
        name: br.room.name,
        colorCode: br.room.colorCode,
        floor: br.room.floor,
        capacity: br.room.capacity,
        isCustomRoom: br.room.isCustomRoom,
      })),
      room: {
        id: b.room.id,
        name: b.room.name,
        colorCode: b.room.colorCode,
        floor: b.room.floor,
        capacity: b.room.capacity,
      },
      customRoomNote: b.customRoomNote || undefined,
      requesterPrefix: b.requesterPrefix,
      requesterPrefixLabel: PREFIX_MAP[b.requesterPrefix],
      requesterName: b.requesterName,
      requesterFullName: `${PREFIX_MAP[b.requesterPrefix]}${b.requesterName}`,
      requesterPosition: b.requesterPosition,
      requesterDepartment: b.requesterDepartment,
      requesterPhone: b.requesterPhone,
      title: b.title,
      description: b.description || undefined,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      attendeeCount: b.attendeeCount,
      amenities: b.bookingAmenities.map((ba) => ({
        amenityCode: ba.amenity.code,
        amenityName: ba.amenity.name,
        quantity: ba.quantity || undefined,
        customNote: ba.customNote || undefined,
      })),
      termsAccepted: b.termsAccepted,
      status: b.status as BookingWorkflowStatus,
      approvals: b.approvals.map((ap) => ({
        id: ap.id,
        step: ap.step,
        approverRole: ap.approverRole,
        approverId: ap.approverId,
        approverName: ap.approver.name,
        approverPosition: ap.approver.position,
        decision: ap.decision,
        readinessStatus: ap.readinessStatus || undefined,
        remarks: ap.remarks || undefined,
        signatureData: ap.signatureData || undefined,
        actedAt: ap.actedAt.toISOString(),
      })),
      user: {
        id: b.user.id,
        name: `${PREFIX_MAP[b.requesterPrefix]}${b.requesterName}`,
        department: b.requesterDepartment,
        position: b.requesterPosition,
        phone: b.requesterPhone,
      },
      createdAt: b.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/bookings] Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางการจอง' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * สร้างคำขอใช้ห้องประชุมใหม่ (สถานะเริ่มต้น PENDING_INSPECTION) + ตรวจสอบการจองซ้อน + Real-time Socket.io
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'ข้อมูลใบคำขอไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { booking, notification } = await createBookingWithLock(parsed.data);

    emitRealtimeEvent(SOCKET_EVENTS.BOOKING_CREATED, {
      booking,
      message: `${booking.requesterFullName} ยื่นคำขอใช้ ${booking.room?.name || 'ห้องประชุม'} (${booking.documentNo})`,
      timestamp: new Date().toISOString(),
    });

    emitRealtimeEvent(
      SOCKET_EVENTS.NOTIFICATION_NEW,
      notification,
      `user:${booking.user.id}`
    );

    const sheetSync = await appendBookingToGoogleSheet({
      id: booking.documentNo || booking.id,
      title: booking.title,
      roomName:
        booking.rooms?.map((r) => r.name).join(', ') ||
        booking.room?.name ||
        '',
      floor: booking.room?.floor || '',
      bookedBy: booking.requesterFullName,
      department: booking.requesterDepartment,
      startTime: booking.startTime,
      endTime: booking.endTime,
      attendeeCount: booking.attendeeCount,
      status: booking.status,
    });

    return NextResponse.json(
      {
        message: 'ยื่นคำขออนุญาตใช้ห้องประชุมสำเร็จ',
        data: booking,
        googleWorkspace: {
          synced: sheetSync.synced,
          spreadsheetUrl: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL,
          driveFolderUrl: GOOGLE_WORKSPACE_CONFIG.DRIVE_FOLDER_URL,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DOUBLE_BOOKING_CONFLICT',
          conflictingBooking: error.conflictingBooking,
        },
        { status: 409 }
      );
    }

    if (error instanceof BookingRuleError) {
      return NextResponse.json(
        { error: error.message, code: 'BOOKING_RULE_VIOLATION' },
        { status: error.statusCode }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2034' || error.code === 'P2002')
    ) {
      return NextResponse.json(
        {
          error:
            'มีผู้ใช้งานท่านอื่นกำลังทำรายการจองห้องและเวลานี้พร้อมกับคุณ กรุณาลองใหม่อีกครั้ง',
          code: 'CONCURRENT_BOOKING_LOCK',
        },
        { status: 409 }
      );
    }

    console.error('[POST /api/bookings] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
