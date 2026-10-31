// src/services/booking.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CreateBookingInput,
  WorkflowTransitionInput,
} from '@/lib/validations/booking';
import {
  OFFICIAL_AMENITIES,
  OFFICIAL_ROOMS,
  PREFIX_MAP,
} from '@/constants/master-data';
import {
  ApprovalRecordItem,
  BookingItemDTO,
  BookingWorkflowStatus,
} from '@/types/booking';
import {
  BLOCKING_BOOKING_STATUSES,
  resolveWorkflowTransition,
} from '@/services/workflow.service';

export class BookingConflictError extends Error {
  public conflictingBooking: {
    id: string;
    documentNo?: string;
    roomName: string;
    title: string;
    startTime: Date;
    endTime: Date;
    bookedBy: string;
    status: string;
  };

  constructor(
    message: string,
    conflictingBooking: {
      id: string;
      documentNo?: string;
      roomName: string;
      title: string;
      startTime: Date;
      endTime: Date;
      bookedBy: string;
      status: string;
    }
  ) {
    super(message);
    this.name = 'BookingConflictError';
    this.conflictingBooking = conflictingBooking;
  }
}

export class BookingRuleError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'BookingRuleError';
    this.statusCode = statusCode;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var inMemoryBookingsV2: BookingItemDTO[] | undefined;
}

/**
 * ฟังก์ชันตรวจสอบการจองซ้อน (Interval Overlap Detection)
 * สูตรคณิตศาสตร์: Existing.Start < New.End AND Existing.End > New.Start
 * รองรับการจองทั้งแบบห้องเดียว (Single) และหลายห้องพร้อมกัน (Multiple Select)
 */
export function findConflictingBookingInList(params: {
  existingBookings: BookingItemDTO[];
  targetRoomIds: string[];
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}): { booking: BookingItemDTO; conflictedRoomId: string } | null {
  const {
    existingBookings,
    targetRoomIds,
    startTime,
    endTime,
    excludeBookingId,
  } = params;

  // ห้อง "อื่น ๆ (room-other)" เป็นสถานที่ระบุเอง จึงไม่นำมาบล็อกชนกับห้องมาตรฐาน
  const standardTargetIds = targetRoomIds.filter((id) => id !== 'room-other');
  if (standardTargetIds.length === 0) return null;

  for (const existing of existingBookings) {
    if (excludeBookingId && existing.id === excludeBookingId) continue;
    if (!BLOCKING_BOOKING_STATUSES.includes(existing.status)) continue;

    const existingRoomIds =
      existing.roomIds && existing.roomIds.length > 0
        ? existing.roomIds
        : [existing.roomId];

    const matchedRoomId = standardTargetIds.find((rid) =>
      existingRoomIds.includes(rid)
    );
    if (!matchedRoomId) continue;

    const exStart = new Date(existing.startTime);
    const exEnd = new Date(existing.endTime);

    if (exStart < endTime && exEnd > startTime) {
      return { booking: existing, conflictedRoomId: matchedRoomId };
    }
  }

  return null;
}

/**
 * สร้างชุดข้อมูลเริ่มต้น (In-Memory Store) ที่มีครบทุกสถานะในสายอนุมัติจริงของ วท.ท่าหลวงฯ
 */
export function getInMemoryBookings(): BookingItemDTO[] {
  if (!globalThis.inMemoryBookingsV2) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yearBE = new Date().getFullYear() + 543;

    globalThis.inMemoryBookingsV2 = [
      // รายการที่ 1: อนุมัติครบทั้ง 3 ขั้นตอนแล้ว (พร้อมพิมพ์แบบฟอร์ม A4 สมบูรณ์)
      {
        id: 'bk-tl-001',
        documentNo: `TL-${yearBE}-0001`,
        roomId: 'room-sakthong',
        roomIds: ['room-sakthong'],
        rooms: [OFFICIAL_ROOMS[1]],
        room: OFFICIAL_ROOMS[1],
        requesterPrefix: 'MR',
        requesterPrefixLabel: 'นาย',
        requesterName: 'สมชาย พัฒนากุล',
        requesterFullName: 'นายสมชาย พัฒนากุล',
        requesterPosition: 'หัวหน้าแผนกวิชาช่างยนต์',
        requesterDepartment: 'แผนกวิชาช่างยนต์',
        requesterPhone: '081-555-1234',
        title: 'ประชุมวางแผนพัฒนาหลักสูตรอาชีวศึกษาสมรรถนะสูง',
        description: 'ประชุมร่วมกับสถานประกอบการเครือข่ายทวิภาคี',
        startTime: new Date(`${todayStr}T09:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T11:30:00`).toISOString(),
        attendeeCount: 45,
        amenities: [
          { amenityCode: 'PROJECTOR', amenityName: 'เครื่องฉายภาพ (Projector)' },
          { amenityCode: 'SOUND', amenityName: 'ระบบเสียง' },
          { amenityCode: 'MIC', amenityName: 'ไมโครโฟน' },
          { amenityCode: 'AIRCON', amenityName: 'เครื่องปรับอากาศ' },
          { amenityCode: 'INTERNET', amenityName: 'อินเทอร์เน็ต' },
        ],
        termsAccepted: true,
        status: 'APPROVED',
        approvals: [
          {
            id: 'apv-101',
            step: 'ROOM_INSPECTION',
            approverRole: 'ROOM_INSPECTOR',
            approverId: 'usr-inspector-01',
            approverName: 'นายวัชรพงศ์ โสภา',
            approverPosition: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
            decision: 'READY',
            readinessStatus: 'READY',
            remarks: 'ตรวจสอบระบบโปรเจคเตอร์และไมโครโฟนไร้สายเรียบร้อย พร้อมใช้งาน',
            signatureData: 'STAMP::นายวัชรพงศ์ โสภา::ตรวจห้องเรียบร้อย',
            actedAt: new Date(`${todayStr}T08:10:00`).toISOString(),
          },
          {
            id: 'apv-102',
            step: 'HEAD_ENDORSEMENT',
            approverRole: 'DEPARTMENT_HEAD',
            approverId: 'usr-head-01',
            approverName: 'นายเอกราช เขียวทอง',
            approverPosition: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
            decision: 'ENDORSED',
            remarks: 'เห็นสมควรอนุญาตให้ใช้ห้องประชุมตามเสนอ',
            signatureData: 'STAMP::นายเอกราช เขียวทอง::รับรองคำขอ',
            actedAt: new Date(`${todayStr}T08:25:00`).toISOString(),
          },
          {
            id: 'apv-103',
            step: 'EXECUTIVE_DECISION',
            approverRole: 'EXECUTIVE_APPROVER',
            approverId: 'usr-exec-01',
            approverName: 'นายชาตรี เริงชัยภูมิ',
            approverPosition: 'รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
            decision: 'APPROVED',
            remarks: 'อนุมัติให้ดำเนินการได้',
            signatureData: 'STAMP::นายชาตรี เริงชัยภูมิ::อนุมัติ',
            actedAt: new Date(`${todayStr}T08:40:00`).toISOString(),
          },
        ],
        user: {
          id: 'usr-teacher-02',
          name: 'นายสมชาย พัฒนากุล',
          department: 'แผนกวิชาช่างยนต์',
          position: 'หัวหน้าแผนกวิชาช่างยนต์',
          phone: '081-555-1234',
        },
        createdAt: new Date(`${todayStr}T08:00:00`).toISOString(),
      },

      // รายการที่ 2: สถานะ ENDORSED (รอ Role 4 รองผู้อำนวยการพิจารณาอนุมัติ)
      {
        id: 'bk-tl-002',
        documentNo: `TL-${yearBE}-0002`,
        roomId: 'room-computer-av',
        roomIds: ['room-computer-av'],
        rooms: [OFFICIAL_ROOMS[5]],
        room: OFFICIAL_ROOMS[5],
        requesterPrefix: 'MS',
        requesterPrefixLabel: 'นางสาว',
        requesterName: 'กนกวรรณ ศรีสวัสดิ์',
        requesterFullName: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
        requesterPosition: 'ครูชำนาญการ',
        requesterDepartment: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
        requesterPhone: '081-456-7890',
        title: 'อบรมเชิงปฏิบัติการระบบเครือข่ายและสื่อดิจิทัล AI สำหรับครู',
        description: 'ขอใช้คอมพิวเตอร์แม่ข่ายและอินเทอร์เน็ตความเร็วสูง',
        startTime: new Date(`${todayStr}T13:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T16:00:00`).toISOString(),
        attendeeCount: 40,
        amenities: [
          { amenityCode: 'PROJECTOR', amenityName: 'เครื่องฉายภาพ (Projector)' },
          { amenityCode: 'SOUND', amenityName: 'ระบบเสียง' },
          { amenityCode: 'MIC', amenityName: 'ไมโครโฟน' },
          { amenityCode: 'AIRCON', amenityName: 'เครื่องปรับอากาศ' },
          { amenityCode: 'INTERNET', amenityName: 'อินเทอร์เน็ต' },
          {
            amenityCode: 'EXTRA_CHAIRS',
            amenityName: 'โต๊ะ/เก้าอี้เพิ่มเติม',
            quantity: 10,
          },
        ],
        termsAccepted: true,
        status: 'ENDORSED',
        approvals: [
          {
            id: 'apv-201',
            step: 'ROOM_INSPECTION',
            approverRole: 'ROOM_INSPECTOR',
            approverId: 'usr-inspector-01',
            approverName: 'นายวัชรพงศ์ โสภา',
            approverPosition: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
            decision: 'READY',
            readinessStatus: 'READY',
            remarks: 'คอมพิวเตอร์และระบบเครือข่ายพร้อมใช้งาน จัดเก้าอี้เสริม 10 ตัวเรียบร้อย',
            signatureData: 'STAMP::นายวัชรพงศ์ โสภา::ตรวจห้องเรียบร้อย',
            actedAt: new Date(`${todayStr}T09:15:00`).toISOString(),
          },
          {
            id: 'apv-202',
            step: 'HEAD_ENDORSEMENT',
            approverRole: 'DEPARTMENT_HEAD',
            approverId: 'usr-head-01',
            approverName: 'นายเอกราช เขียวทอง',
            approverPosition: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
            decision: 'ENDORSED',
            remarks: 'ตรวจสอบแล้ว เห็นควรเสนอรองผู้อำนวยการพิจารณาอนุมัติ',
            signatureData: 'STAMP::นายเอกราช เขียวทอง::รับรองคำขอ',
            actedAt: new Date(`${todayStr}T09:45:00`).toISOString(),
          },
        ],
        user: {
          id: 'usr-requester-01',
          name: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
          department: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
          position: 'ครูชำนาญการ',
          phone: '081-456-7890',
        },
        createdAt: new Date(`${todayStr}T09:00:00`).toISOString(),
      },

      // รายการที่ 3: สถานะ INSPECTED_READY (รอ Role 3 หัวหน้างานกดรับรอง)
      {
        id: 'bk-tl-003',
        documentNo: `TL-${yearBE}-0003`,
        roomId: 'room-director',
        roomIds: ['room-director'],
        rooms: [OFFICIAL_ROOMS[2]],
        room: OFFICIAL_ROOMS[2],
        requesterPrefix: 'MRS',
        requesterPrefixLabel: 'นาง',
        requesterName: 'วิไลพร ทองดี',
        requesterFullName: 'นางวิไลพร ทองดี',
        requesterPosition: 'หัวหน้างานประกันคุณภาพและมาตรฐานการศึกษา',
        requesterDepartment: 'งานประกันคุณภาพและมาตรฐานการศึกษา',
        requesterPhone: '086-321-9876',
        title: 'ประชุมคณะกรรมการประเมินคุณภาพการศึกษาภายในสถานศึกษา',
        startTime: new Date(`${todayStr}T13:30:00`).toISOString(),
        endTime: new Date(`${todayStr}T15:30:00`).toISOString(),
        attendeeCount: 18,
        amenities: [
          { amenityCode: 'PROJECTOR', amenityName: 'เครื่องฉายภาพ (Projector)' },
          { amenityCode: 'MIC', amenityName: 'ไมโครโฟน' },
          { amenityCode: 'AIRCON', amenityName: 'เครื่องปรับอากาศ' },
          { amenityCode: 'INTERNET', amenityName: 'อินเทอร์เน็ต' },
        ],
        termsAccepted: true,
        status: 'INSPECTED_READY',
        approvals: [
          {
            id: 'apv-301',
            step: 'ROOM_INSPECTION',
            approverRole: 'ROOM_INSPECTOR',
            approverId: 'usr-inspector-01',
            approverName: 'นายวัชรพงศ์ โสภา',
            approverPosition: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
            decision: 'READY',
            readinessStatus: 'READY',
            remarks: 'ห้องประชุมหน้าห้องผู้อำนวยการและจอภาพพร้อมใช้งาน',
            signatureData: 'STAMP::นายวัชรพงศ์ โสภา::ตรวจห้องเรียบร้อย',
            actedAt: new Date(`${todayStr}T10:15:00`).toISOString(),
          },
        ],
        user: {
          id: 'usr-teacher-03',
          name: 'นางวิไลพร ทองดี',
          department: 'งานประกันคุณภาพและมาตรฐานการศึกษา',
          position: 'หัวหน้างานประกันคุณภาพและมาตรฐานการศึกษา',
          phone: '086-321-9876',
        },
        createdAt: new Date(`${todayStr}T09:50:00`).toISOString(),
      },

      // รายการที่ 4: สถานะ PENDING_INSPECTION (รอ Role 2 เจ้าหน้าที่ผู้ตรวจสอบห้อง)
      {
        id: 'bk-tl-004',
        documentNo: `TL-${yearBE}-0004`,
        roomId: 'room-adireksarn',
        roomIds: ['room-adireksarn', 'room-dome'],
        rooms: [OFFICIAL_ROOMS[0], OFFICIAL_ROOMS[4]],
        room: OFFICIAL_ROOMS[0],
        requesterPrefix: 'MS',
        requesterPrefixLabel: 'นางสาว',
        requesterName: 'กนกวรรณ ศรีสวัสดิ์',
        requesterFullName: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
        requesterPosition: 'ครูชำนาญการ',
        requesterDepartment: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
        requesterPhone: '081-456-7890',
        title: 'โครงการปฐมนิเทศนักศึกษาฝึกงานระบบทวิภาคี ภาคเรียนที่ 2',
        startTime: new Date(`${todayStr}T15:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T17:00:00`).toISOString(),
        attendeeCount: 250,
        amenities: [
          { amenityCode: 'PROJECTOR', amenityName: 'เครื่องฉายภาพ (Projector)' },
          { amenityCode: 'SOUND', amenityName: 'ระบบเสียง' },
          { amenityCode: 'MIC', amenityName: 'ไมโครโฟน' },
          { amenityCode: 'AIRCON', amenityName: 'เครื่องปรับอากาศ' },
          {
            amenityCode: 'EXTRA_CHAIRS',
            amenityName: 'โต๊ะ/เก้าอี้เพิ่มเติม',
            quantity: 50,
          },
          {
            amenityCode: 'OTHER',
            amenityName: 'อื่น ๆ',
            customNote: 'โพเดียมพิธีกรและจุดลงทะเบียนด้านหน้า 2 จุด',
          },
        ],
        termsAccepted: true,
        status: 'PENDING_INSPECTION',
        approvals: [],
        user: {
          id: 'usr-requester-01',
          name: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
          department: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
          position: 'ครูชำนาญการ',
          phone: '081-456-7890',
        },
        createdAt: new Date(`${todayStr}T10:30:00`).toISOString(),
      },
    ];
  }
  return globalThis.inMemoryBookingsV2;
}

/**
 * สร้างเลขที่เอกสารใบคำขออัตโนมัติ เช่น TL-2569-0005
 */
function generateDocumentNo(sequenceNumber: number): string {
  const yearBE = new Date().getFullYear() + 543;
  return `TL-${yearBE}-${String(sequenceNumber).padStart(4, '0')}`;
}

/**
 * สร้างคำขอใช้ห้องประชุมใหม่ (เริ่มต้นที่สถานะ PENDING_INSPECTION)
 * พร้อมตรวจสอบความจุห้องและป้องกันการจองซ้อน (Double Booking Prevention)
 */
export async function createBookingWithLock(input: CreateBookingInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const targetRoomIds =
    input.roomIds && input.roomIds.length > 0 ? input.roomIds : [input.roomId];
  const primaryRoomId = targetRoomIds[0];

  const prefixLabel = PREFIX_MAP[input.requesterPrefix] || 'นาย';
  const cleanName = input.requesterName
    .replace(/^(นาย|นางสาว|นาง)\s*/, '')
    .trim();
  const fullRequesterName = `${prefixLabel}${cleanName}`;

  // =========================================================================
  // โหมดที่ 1: In-Memory Engine (ทำงานทันทีเมื่อไม่ได้เชื่อมต่อ DATABASE_URL)
  // =========================================================================
  if (!process.env.DATABASE_URL) {
    const selectedRooms = targetRoomIds.map((rid) => {
      const found = OFFICIAL_ROOMS.find((r) => r.id === rid);
      if (!found) {
        throw new BookingRuleError(`ไม่พบข้อมูลห้องประชุมรหัส ${rid}`, 404);
      }
      if (!found.isActive) {
        throw new BookingRuleError(
          `ห้องประชุม "${found.name}" ปิดปรับปรุงชั่วคราว ไม่สามารถจองได้`,
          400
        );
      }
      return found;
    });

    // คำนวณความจุรวมของห้องที่เลือก (ยกเว้นห้อง 'อื่น ๆ' ที่ไม่จำกัดเพดานตายตัว)
    const hasCustomRoom = selectedRooms.some((r) => r.isCustomRoom);
    const totalCapacity = selectedRooms.reduce((sum, r) => sum + r.capacity, 0);
    if (!hasCustomRoom && input.attendeeCount > totalCapacity) {
      throw new BookingRuleError(
        `จำนวนผู้เข้าใช้ (${input.attendeeCount} คน) เกินความจุรวมของห้องที่เลือก (รองรับสูงสุด ${totalCapacity} คน)`,
        400
      );
    }

    const store = getInMemoryBookings();
    const conflictResult = findConflictingBookingInList({
      existingBookings: store,
      targetRoomIds,
      startTime,
      endTime,
    });

    if (conflictResult) {
      const conflictedRoom =
        OFFICIAL_ROOMS.find((r) => r.id === conflictResult.conflictedRoomId) ||
        selectedRooms[0];
      throw new BookingConflictError(
        `ห้อง "${conflictedRoom.name}" มีรายการจองหรือคำขอค้างอยู่ในช่วงเวลาดังกล่าวแล้ว`,
        {
          id: conflictResult.booking.id,
          documentNo: conflictResult.booking.documentNo,
          roomName: conflictedRoom.name,
          title: conflictResult.booking.title,
          startTime: new Date(conflictResult.booking.startTime),
          endTime: new Date(conflictResult.booking.endTime),
          bookedBy: conflictResult.booking.requesterFullName,
          status: conflictResult.booking.status,
        }
      );
    }

    const docNo = generateDocumentNo(store.length + 1);
    const newBooking: BookingItemDTO = {
      id: `bk-${Date.now().toString(36)}`,
      documentNo: docNo,
      roomId: primaryRoomId,
      roomIds: targetRoomIds,
      rooms: selectedRooms,
      room: selectedRooms[0],
      customRoomNote: input.customRoomNote,
      requesterPrefix: input.requesterPrefix,
      requesterPrefixLabel: prefixLabel,
      requesterName: cleanName,
      requesterFullName: fullRequesterName,
      requesterPosition: input.requesterPosition,
      requesterDepartment: input.requesterDepartment,
      requesterPhone: input.requesterPhone,
      title: input.title,
      description: input.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeCount: input.attendeeCount,
      amenities: input.amenities || [],
      termsAccepted: input.termsAccepted,
      status: 'PENDING_INSPECTION',
      approvals: [],
      user: {
        id: input.userId,
        name: fullRequesterName,
        department: input.requesterDepartment,
        position: input.requesterPosition,
        phone: input.requesterPhone,
      },
      createdAt: new Date().toISOString(),
    };

    store.push(newBooking);

    const notification = {
      id: `notif-${Date.now()}`,
      userId: input.userId,
      bookingId: newBooking.id,
      type: 'BOOKING_CREATED' as const,
      message: `ยื่นคำขอเลขที่ ${docNo} (${selectedRooms.map((r) => r.name).join(', ')}) สำเร็จ รอเจ้าหน้าที่ตรวจสอบห้อง`,
      isRead: false,
      createdAt: new Date(),
    };

    return { booking: newBooking, notification };
  }

  // =========================================================================
  // โหมดที่ 2: PostgreSQL Serializable Transaction เต็มรูปแบบผ่าน Prisma ORM
  // =========================================================================
  return await prisma.$transaction(
    async (tx) => {
      const rooms = await tx.room.findMany({
        where: { id: { in: targetRoomIds } },
      });

      if (rooms.length !== targetRoomIds.length) {
        throw new BookingRuleError('ไม่พบห้องประชุมบางรายการที่ระบุ', 404);
      }

      const inactiveRoom = rooms.find((r) => !r.isActive);
      if (inactiveRoom) {
        throw new BookingRuleError(
          `ห้องประชุม "${inactiveRoom.name}" ปิดปรับปรุงชั่วคราว`,
          400
        );
      }

      const hasCustomRoom = rooms.some((r) => r.isCustomRoom);
      const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
      if (!hasCustomRoom && input.attendeeCount > totalCapacity) {
        throw new BookingRuleError(
          `จำนวนผู้เข้าใช้ (${input.attendeeCount} คน) เกินความจุรวมของห้องที่เลือก (สูงสุด ${totalCapacity} คน)`,
          400
        );
      }

      const standardRoomIds = rooms
        .filter((r) => !r.isCustomRoom)
        .map((r) => r.id);

      if (standardRoomIds.length > 0) {
        const conflicting = await tx.booking.findFirst({
          where: {
            status: { in: BLOCKING_BOOKING_STATUSES },
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
              {
                OR: [
                  { roomId: { in: standardRoomIds } },
                  {
                    bookingRooms: {
                      some: { roomId: { in: standardRoomIds } },
                    },
                  },
                ],
              },
            ],
          },
          include: {
            room: { select: { name: true } },
            user: { select: { name: true } },
          },
          orderBy: { startTime: 'asc' },
        });

        if (conflicting) {
          throw new BookingConflictError(
            `ห้อง "${conflicting.room.name}" ถูกจองหรืออยู่ระหว่างรออนุมัติในช่วงเวลาดังกล่าวแล้ว`,
            {
              id: conflicting.id,
              documentNo: conflicting.documentNo,
              roomName: conflicting.room.name,
              title: conflicting.title,
              startTime: conflicting.startTime,
              endTime: conflicting.endTime,
              bookedBy: conflicting.requesterName || conflicting.user.name,
              status: conflicting.status,
            }
          );
        }
      }

      const count = await tx.booking.count();
      const documentNo = generateDocumentNo(count + 1);

      // จับคู่รหัส Amenity ในฐานข้อมูล (ถ้ามี)
      const amenityCodes = (input.amenities || []).map((a) => a.amenityCode);
      const dbAmenities =
        amenityCodes.length > 0
          ? await tx.amenity.findMany({
              where: { code: { in: amenityCodes } },
            })
          : [];
      const amenityIdByCode = new Map(dbAmenities.map((a) => [a.code, a.id]));

      const created = await tx.booking.create({
        data: {
          documentNo,
          roomId: primaryRoomId,
          userId: input.userId,
          requesterPrefix: input.requesterPrefix,
          requesterName: cleanName,
          requesterPosition: input.requesterPosition,
          requesterDepartment: input.requesterDepartment,
          requesterPhone: input.requesterPhone,
          title: input.title,
          description: input.description,
          startTime,
          endTime,
          attendeeCount: input.attendeeCount,
          customRoomNote: input.customRoomNote,
          termsAccepted: input.termsAccepted,
          status: 'PENDING_INSPECTION',
          bookingRooms: {
            create: targetRoomIds.map((rid) => ({
              roomId: rid,
              customRoomLabel:
                rid === 'room-other' ? input.customRoomNote : undefined,
            })),
          },
          bookingAmenities: {
            create: (input.amenities || [])
              .filter((am) => amenityIdByCode.has(am.amenityCode))
              .map((am) => ({
                amenityId: amenityIdByCode.get(am.amenityCode)!,
                quantity: am.quantity,
                customNote: am.customNote,
              })),
          },
        },
        include: {
          room: true,
          bookingRooms: { include: { room: true } },
          bookingAmenities: { include: { amenity: true } },
          approvals: { include: { approver: true } },
          user: true,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: input.userId,
          bookingId: created.id,
          type: 'BOOKING_CREATED',
          message: `ยื่นคำขอเลขที่ ${documentNo} สำเร็จ รอเจ้าหน้าที่ตรวจสอบห้อง`,
        },
      });

      const dto: BookingItemDTO = {
        id: created.id,
        documentNo: created.documentNo,
        roomId: created.roomId,
        roomIds: created.bookingRooms.map((br) => br.roomId),
        rooms: created.bookingRooms.map((br) => ({
          id: br.room.id,
          name: br.room.name,
          colorCode: br.room.colorCode,
          floor: br.room.floor,
          capacity: br.room.capacity,
          isCustomRoom: br.room.isCustomRoom,
        })),
        room: {
          id: created.room.id,
          name: created.room.name,
          colorCode: created.room.colorCode,
          floor: created.room.floor,
          capacity: created.room.capacity,
        },
        customRoomNote: created.customRoomNote || undefined,
        requesterPrefix: created.requesterPrefix,
        requesterPrefixLabel: PREFIX_MAP[created.requesterPrefix],
        requesterName: created.requesterName,
        requesterFullName: `${PREFIX_MAP[created.requesterPrefix]}${created.requesterName}`,
        requesterPosition: created.requesterPosition,
        requesterDepartment: created.requesterDepartment,
        requesterPhone: created.requesterPhone,
        title: created.title,
        description: created.description || undefined,
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
        attendeeCount: created.attendeeCount,
        amenities:
          input.amenities ||
          created.bookingAmenities.map((ba) => ({
            amenityCode: ba.amenity.code,
            amenityName: ba.amenity.name,
            quantity: ba.quantity || undefined,
            customNote: ba.customNote || undefined,
          })),
        termsAccepted: created.termsAccepted,
        status: created.status as BookingWorkflowStatus,
        approvals: [],
        user: {
          id: created.user.id,
          name: fullRequesterName,
          department: created.requesterDepartment,
          position: created.requesterPosition,
          phone: created.requesterPhone,
        },
        createdAt: created.createdAt.toISOString(),
      };

      return { booking: dto, notification };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * ดำเนินการเปลี่ยนสถานะใน Workflow State Machine (ตรวจสอบห้อง -> รับรอง -> อนุมัติ / ไม่อนุมัติ / ยกเลิก)
 */
export async function executeBookingWorkflowTransition(
  bookingId: string,
  input: WorkflowTransitionInput
) {
  // โหมดที่ 1: In-Memory Engine
  if (!process.env.DATABASE_URL) {
    const store = getInMemoryBookings();
    const target = store.find((b) => b.id === bookingId);
    if (!target) {
      throw new BookingRuleError('ไม่พบรายการคำขอใช้ห้องประชุมที่ระบุ', 404);
    }

    const isOwner = target.user.id === input.actorId;
    const resolved = resolveWorkflowTransition({
      currentStatus: target.status,
      action: input.action,
      actorRole: input.actorRole,
      isOwner,
    });

    // หากเป็นการอนุมัติขั้นสุดท้าย ตรวจสอบซ้ำอีกครั้งว่าไม่มีรายการที่อนุมัติแล้วชนกัน
    if (resolved.nextStatus === 'APPROVED') {
      const conflict = findConflictingBookingInList({
        existingBookings: store.filter((b) => b.status === 'APPROVED'),
        targetRoomIds: target.roomIds,
        startTime: new Date(target.startTime),
        endTime: new Date(target.endTime),
        excludeBookingId: target.id,
      });

      if (conflict) {
        const roomObj = OFFICIAL_ROOMS.find(
          (r) => r.id === conflict.conflictedRoomId
        );
        throw new BookingConflictError(
          `ไม่สามารถอนุมัติได้ เนื่องจากห้อง "${roomObj?.name || ''}" มีรายการที่ได้รับอนุมัติไปแล้วในช่วงเวลาเดียวกัน`,
          {
            id: conflict.booking.id,
            documentNo: conflict.booking.documentNo,
            roomName: roomObj?.name || '',
            title: conflict.booking.title,
            startTime: new Date(conflict.booking.startTime),
            endTime: new Date(conflict.booking.endTime),
            bookedBy: conflict.booking.requesterFullName,
            status: conflict.booking.status,
          }
        );
      }
    }

    target.status = resolved.nextStatus;

    if (resolved.approvalStep && resolved.decision) {
      const newRecord: ApprovalRecordItem = {
        id: `apv-${Date.now().toString(36)}`,
        step: resolved.approvalStep,
        approverRole: input.actorRole,
        approverId: input.actorId,
        approverName: input.actorName,
        approverPosition: input.actorPosition,
        decision: resolved.decision,
        readinessStatus: resolved.readinessStatus,
        remarks: input.remarks,
        signatureData:
          input.signatureData ||
          `STAMP::${input.actorName}::${resolved.actionLabel}`,
        actedAt: new Date().toISOString(),
      };

      // แทนที่หากเคยบันทึก Step เดิม หรือเพิ่มต่อท้ายตามลำดับ
      const existingIdx = target.approvals.findIndex(
        (a) => a.step === resolved.approvalStep
      );
      if (existingIdx >= 0) {
        target.approvals[existingIdx] = newRecord;
      } else {
        target.approvals.push(newRecord);
      }
    }

    return {
      booking: target,
      actionLabel: resolved.actionLabel,
    };
  }

  // โหมดที่ 2: PostgreSQL Database via Prisma Transaction
  return await prisma.$transaction(
    async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          bookingRooms: { include: { room: true } },
          bookingAmenities: { include: { amenity: true } },
          approvals: { include: { approver: true } },
          user: true,
        },
      });

      if (!existing) {
        throw new BookingRuleError('ไม่พบรายการคำขอใช้ห้องประชุมที่ระบุ', 404);
      }

      const isOwner = existing.userId === input.actorId;
      const resolved = resolveWorkflowTransition({
        currentStatus: existing.status as BookingWorkflowStatus,
        action: input.action,
        actorRole: input.actorRole,
        isOwner,
      });

      if (resolved.approvalStep && resolved.decision) {
        await tx.approval.upsert({
          where: {
            bookingId_step: {
              bookingId: existing.id,
              step: resolved.approvalStep,
            },
          },
          create: {
            bookingId: existing.id,
            step: resolved.approvalStep,
            approverRole: input.actorRole,
            approverId: input.actorId,
            decision: resolved.decision,
            readinessStatus: resolved.readinessStatus,
            remarks: input.remarks,
            signatureData: input.signatureData,
          },
          update: {
            approverRole: input.actorRole,
            approverId: input.actorId,
            decision: resolved.decision,
            readinessStatus: resolved.readinessStatus,
            remarks: input.remarks,
            signatureData: input.signatureData,
            actedAt: new Date(),
          },
        });
      }

      const updated = await tx.booking.update({
        where: { id: existing.id },
        data: { status: resolved.nextStatus },
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
      });

      await tx.notification.create({
        data: {
          userId: updated.userId,
          bookingId: updated.id,
          type:
            resolved.nextStatus === 'APPROVED'
              ? 'BOOKING_APPROVED'
              : resolved.nextStatus === 'REJECTED'
              ? 'BOOKING_REJECTED'
              : 'WORKFLOW_UPDATED',
          message: `คำขอ ${updated.documentNo}: ${resolved.actionLabel} โดย ${input.actorName}`,
        },
      });

      const dto: BookingItemDTO = {
        id: updated.id,
        documentNo: updated.documentNo,
        roomId: updated.roomId,
        roomIds: updated.bookingRooms.map((br) => br.roomId),
        rooms: updated.bookingRooms.map((br) => ({
          id: br.room.id,
          name: br.room.name,
          colorCode: br.room.colorCode,
          floor: br.room.floor,
          capacity: br.room.capacity,
          isCustomRoom: br.room.isCustomRoom,
        })),
        room: {
          id: updated.room.id,
          name: updated.room.name,
          colorCode: updated.room.colorCode,
          floor: updated.room.floor,
          capacity: updated.room.capacity,
        },
        customRoomNote: updated.customRoomNote || undefined,
        requesterPrefix: updated.requesterPrefix,
        requesterPrefixLabel: PREFIX_MAP[updated.requesterPrefix],
        requesterName: updated.requesterName,
        requesterFullName: `${PREFIX_MAP[updated.requesterPrefix]}${updated.requesterName}`,
        requesterPosition: updated.requesterPosition,
        requesterDepartment: updated.requesterDepartment,
        requesterPhone: updated.requesterPhone,
        title: updated.title,
        description: updated.description || undefined,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        attendeeCount: updated.attendeeCount,
        amenities: updated.bookingAmenities.map((ba) => ({
          amenityCode: ba.amenity.code,
          amenityName: ba.amenity.name,
          quantity: ba.quantity || undefined,
          customNote: ba.customNote || undefined,
        })),
        termsAccepted: updated.termsAccepted,
        status: updated.status as BookingWorkflowStatus,
        approvals: updated.approvals.map((ap) => ({
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
          id: updated.user.id,
          name: `${PREFIX_MAP[updated.requesterPrefix]}${updated.requesterName}`,
          department: updated.requesterDepartment,
          position: updated.requesterPosition,
          phone: updated.requesterPhone,
        },
        createdAt: updated.createdAt.toISOString(),
      };

      return {
        booking: dto,
        actionLabel: resolved.actionLabel,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
