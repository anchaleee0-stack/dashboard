// src/lib/validations/booking.ts
import { z } from 'zod';

const MIN_BOOKING_MINUTES = 15;
const THAI_PHONE_REGEX = /^0[0-9]{1,2}-?[0-9]{3}-?[0-9]{3,4}$/;

// =========================================================
// 1. Schema สำหรับฟอร์มยื่นคำขอจองห้องประชุม (React Hook Form + Zod)
// =========================================================
export const bookingWizardSchema = z
  .object({
    // หมวดที่ 1: ข้อมูลผู้ขอใช้งาน
    requesterPrefix: z.enum(['MR', 'MRS', 'MS'], {
      required_error: 'กรุณาเลือกคำนำหน้าชื่อ',
    }),
    requesterName: z
      .string()
      .trim()
      .min(3, 'กรุณาระบุชื่อ-นามสกุล ให้ครบถ้วน')
      .max(120, 'ชื่อ-นามสกุลยาวเกินไป'),
    requesterPosition: z
      .string()
      .trim()
      .min(2, 'กรุณาระบุตำแหน่ง')
      .max(100, 'ชื่อตำแหน่งยาวเกินไป'),
    requesterDepartment: z
      .string()
      .trim()
      .min(2, 'กรุณาระบุหน่วยงาน / สาขาวิชา')
      .max(120, 'ชื่อหน่วยงานยาวเกินไป'),
    requesterPhone: z
      .string()
      .trim()
      .regex(THAI_PHONE_REGEX, 'รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)'),

    // หมวดที่ 2: ข้อมูลห้องประชุมที่ต้องการจอง (Single / Multiple Select)
    roomIds: z
      .array(z.string().min(1))
      .min(1, 'กรุณาเลือกห้องประชุมอย่างน้อย 1 ห้อง'),
    customRoomNote: z.string().trim().max(200).optional(),

    // หมวดที่ 3: รายละเอียดการใช้งาน
    title: z
      .string()
      .trim()
      .min(4, 'กรุณาระบุวัตถุประสงค์ / เรื่องที่ขอใช้ห้องอย่างน้อย 4 ตัวอักษร')
      .max(200, 'หัวข้อวัตถุประสงค์ยาวเกินไป'),
    description: z.string().trim().max(500).optional(),
    startDateStr: z.string().min(10, 'กรุณาเลือกวันที่เริ่มต้น'),
    endDateStr: z.string().min(10, 'กรุณาเลือกวันที่สิ้นสุด'),
    startHour: z.string().regex(/^\d{2}:\d{2}$/, 'กรุณาระบุเวลาเริ่มต้น'),
    endHour: z.string().regex(/^\d{2}:\d{2}$/, 'กรุณาระบุเวลาสิ้นสุด'),
    attendeeCount: z
      .number({ invalid_type_error: 'กรุณาระบุจำนวนผู้เข้าใช้เป็นตัวเลข' })
      .int('จำนวนคนต้องเป็นจำนวนเต็ม')
      .min(1, 'จำนวนผู้เข้าใช้ต้องมีอย่างน้อย 1 คน')
      .max(2000, 'จำนวนผู้เข้าใช้เกินขีดจำกัดของระบบ'),

    // หมวดที่ 4: ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวก
    standardAmenities: z.array(z.string()),
    extraChairsEnabled: z.boolean(),
    extraChairsCount: z.number().int().min(0).max(1000).optional(),
    otherAmenityEnabled: z.boolean(),
    otherAmenityText: z.string().trim().max(200).optional(),

    // หมวดที่ 5: ข้อกำหนดและเงื่อนไข
    termsAccepted: z.boolean().refine((val) => val === true, {
      message:
        'กรุณากดยอมรับข้อตกลงในการดูแลรักษาทรัพย์สินของทางราชการและปฏิบัติตามระเบียบของวิทยาลัยฯ',
    }),
  })
  .superRefine((data, ctx) => {
    // 1. หากเลือกห้อง "อื่น ๆ (room-other)" ต้องระบุชื่อสถานที่เพิ่มเติม
    if (data.roomIds.includes('room-other') && !data.customRoomNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customRoomNote'],
        message: 'กรุณาระบุชื่อห้องหรือสถานที่เพิ่มเติมเมื่อเลือก "อื่น ๆ"',
      });
    }

    // 2. ตรวจสอบวัน-เวลาเริ่มต้น และวัน-เวลาสิ้นสุด
    if (data.endDateStr < data.startDateStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDateStr'],
        message: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น',
      });
      return;
    }

    const startDT = new Date(`${data.startDateStr}T${data.startHour}:00`);
    const endDT = new Date(`${data.endDateStr}T${data.endHour}:00`);

    if (isNaN(startDT.getTime()) || isNaN(endDT.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startHour'],
        message: 'รูปแบบวันหรือเวลาไม่ถูกต้อง',
      });
      return;
    }

    if (endDT <= startDT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endHour'],
        message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      });
      return;
    }

    const durationMinutes = (endDT.getTime() - startDT.getTime()) / (1000 * 60);
    if (durationMinutes < MIN_BOOKING_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endHour'],
        message: `ระยะเวลาขอใช้ห้องขั้นต่ำคือ ${MIN_BOOKING_MINUTES} นาที`,
      });
    }

    // 3. หากเลือก "โต๊ะ/เก้าอี้เพิ่มเติม" ต้องระบุจำนวนตัวตั้งแต่ 1 ตัวขึ้นไป
    if (data.extraChairsEnabled && (!data.extraChairsCount || data.extraChairsCount < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extraChairsCount'],
        message: 'กรุณาระบุจำนวนโต๊ะ/เก้าอี้เพิ่มเติมอย่างน้อย 1 ตัว',
      });
    }

    // 4. หากเลือกอุปกรณ์ "อื่น ๆ" ต้องระบุข้อความ
    if (data.otherAmenityEnabled && !data.otherAmenityText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherAmenityText'],
        message: 'กรุณาระบุรายการอุปกรณ์อื่น ๆ ที่ต้องการขอใช้',
      });
    }
  });

export type BookingWizardFormValues = z.infer<typeof bookingWizardSchema>;

// =========================================================
// 2. Schema สำหรับ API POST /api/bookings
// =========================================================
export const createBookingSchema = z
  .object({
    userId: z.string().min(1, 'ไม่พบรหัสผู้ใช้งาน'),
    roomId: z.string().min(1, 'กรุณาเลือกห้องประชุมหลัก'),
    roomIds: z.array(z.string().min(1)).min(1, 'กรุณาเลือกห้องประชุมอย่างน้อย 1 ห้อง').optional(),
    customRoomNote: z.string().trim().max(200).optional(),

    requesterPrefix: z.enum(['MR', 'MRS', 'MS']).default('MR'),
    requesterName: z.string().trim().min(2, 'กรุณาระบุชื่อ-นามสกุลผู้ขอ'),
    requesterPosition: z.string().trim().min(2, 'กรุณาระบุตำแหน่ง'),
    requesterDepartment: z.string().trim().min(2, 'กรุณาระบุหน่วยงาน/สาขาวิชา'),
    requesterPhone: z.string().trim().min(6, 'กรุณาระบุหมายเลขโทรศัพท์'),

    title: z.string().trim().min(3, 'หัวข้อการประชุมต้องมีอย่างน้อย 3 ตัวอักษร').max(200),
    description: z.string().trim().max(1000).optional(),
    attendeeCount: z.number().int().min(1, 'จำนวนผู้เข้าร่วมต้องมีอย่างน้อย 1 คน'),
    startTime: z.string().datetime({ message: 'รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (ISO 8601)' }),
    endTime: z.string().datetime({ message: 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (ISO 8601)' }),

    amenities: z
      .array(
        z.object({
          amenityCode: z.string(),
          amenityName: z.string(),
          quantity: z.number().int().min(1).optional(),
          customNote: z.string().optional(),
        })
      )
      .default([]),
    termsAccepted: z.boolean().refine((v) => v === true, {
      message: 'ต้องยอมรับข้อตกลงและระเบียบของวิทยาลัยฯ',
    }),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      });
      return;
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < MIN_BOOKING_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `ระยะเวลาการจองขั้นต่ำคือ ${MIN_BOOKING_MINUTES} นาที`,
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// =========================================================
// 3. Schema สำหรับ API การตรวจสอบ / รับรอง / อนุมัติคำขอ (Workflow State Machine)
// =========================================================
export const workflowTransitionSchema = z
  .object({
    actorId: z.string().min(1, 'ไม่พบรหัสผู้ดำเนินการ'),
    actorName: z.string().min(2, 'ไม่พบชื่อผู้ดำเนินการ'),
    actorPosition: z.string().min(2, 'ไม่พบตำแหน่งผู้ดำเนินการ'),
    actorRole: z.enum([
      'REQUESTER',
      'ROOM_INSPECTOR',
      'DEPARTMENT_HEAD',
      'EXECUTIVE_APPROVER',
      'ADMIN',
    ]),
    action: z.enum([
      'INSPECT_READY',     // Role 2: พร้อมใช้งาน
      'INSPECT_NOT_READY', // Role 2: ไม่พร้อมใช้งาน (ต้องระบุเหตุผล)
      'ENDORSE',           // Role 3: หัวหน้างานลงนามรับรอง
      'APPROVE',           // Role 4: รองผู้อำนวยการอนุมัติ
      'REJECT',            // Role 3/4: ไม่อนุมัติ
      'CANCEL',            // Role 1: ผู้ยื่นยกเลิกคำขอ
    ]),
    remarks: z.string().trim().max(500).optional(),
    signatureData: z.string().optional(), // Base64 Canvas หรือ Digital Stamp
  })
  .superRefine((data, ctx) => {
    // บังคับระบุเหตุผลเมื่อห้องไม่พร้อมใช้งาน หรือเมื่อไม่อนุมัติ
    if (
      (data.action === 'INSPECT_NOT_READY' || data.action === 'REJECT') &&
      (!data.remarks || data.remarks.trim().length < 3)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['remarks'],
        message:
          data.action === 'INSPECT_NOT_READY'
            ? 'กรุณาระบุเหตุผลที่ห้องหรืออุปกรณ์ไม่พร้อมใช้งาน'
            : 'กรุณาระบุเหตุผลหรือหมายเหตุการไม่อนุมัติ',
      });
    }
  });

export type WorkflowTransitionInput = z.infer<typeof workflowTransitionSchema>;
