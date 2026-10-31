// src/types/booking.ts

export type NamePrefixType = 'MR' | 'MRS' | 'MS';

export type UserRoleType =
  | 'REQUESTER'          // Role 1: ผู้ยื่นคำขอ (บุคลากร / ครู)
  | 'ROOM_INSPECTOR'     // Role 2: เจ้าหน้าที่ผู้ตรวจสอบห้อง
  | 'DEPARTMENT_HEAD'    // Role 3: หัวหน้างาน/ผู้รับรอง
  | 'EXECUTIVE_APPROVER' // Role 4: ผู้พิจารณาอนุมัติ (รองผู้อำนวยการฯ)
  | 'ADMIN';

export type BookingWorkflowStatus =
  | 'PENDING_INSPECTION'  // รอตรวจสอบห้อง
  | 'INSPECTED_READY'     // ตรวจสอบแล้ว (พร้อมใช้งาน) -> รอหัวหน้างานรับรอง
  | 'INSPECTED_NOT_READY' // ตรวจสอบแล้ว (ไม่พร้อมใช้งาน)
  | 'ENDORSED'            // หัวหน้างานรับรองแล้ว -> รอผู้บริหารอนุมัติ
  | 'APPROVED'            // อนุมัติแล้ว
  | 'REJECTED'            // ไม่อนุมัติ
  | 'CANCELLED';          // ยกเลิกคำขอ

export type InspectionReadinessType = 'READY' | 'NOT_READY';

export type ApprovalStepType =
  | 'ROOM_INSPECTION'
  | 'HEAD_ENDORSEMENT'
  | 'EXECUTIVE_DECISION';

export type ApprovalDecisionType =
  | 'PENDING'
  | 'READY'
  | 'NOT_READY'
  | 'ENDORSED'
  | 'APPROVED'
  | 'REJECTED';

export interface RoleUserProfile {
  id: string;
  email: string;
  prefix: NamePrefixType;
  prefixLabel: 'นาย' | 'นาง' | 'นางสาว';
  name: string;
  fullName: string;
  position: string;
  department: string;
  phone: string;
  role: UserRoleType;
  roleBadgeLabel: string;
}

export interface RoomOption {
  id: string;
  code: string;
  name: string;
  capacity: number;
  floor: string;
  building?: string;
  amenities: string[];
  colorCode: string;
  isCustomRoom?: boolean;
  isActive: boolean;
}

export interface AmenityOption {
  id: string;
  code: string;
  name: string;
  requiresQuantity?: boolean;
  requiresCustomText?: boolean;
}

export interface BookingAmenitySelection {
  amenityCode: string;
  amenityName: string;
  quantity?: number;
  customNote?: string;
}

export interface ApprovalRecordItem {
  id: string;
  step: ApprovalStepType;
  approverRole: UserRoleType;
  approverId: string;
  approverName: string;
  approverPosition: string;
  decision: ApprovalDecisionType;
  readinessStatus?: InspectionReadinessType;
  remarks?: string;
  signatureData?: string; // Base64 Data URL หรือข้อความตราประทับดิจิทัล
  actedAt: string;        // ISO timestamp
}

export interface BookingItemDTO {
  id: string;
  documentNo: string;
  roomId: string;           // ห้องหลัก (Primary Room)
  roomIds: string[];        // รองรับทั้ง Single และ Multiple Select
  rooms?: {
    id: string;
    name: string;
    colorCode: string;
    floor: string;
    capacity: number;
    isCustomRoom?: boolean;
  }[];
  customRoomNote?: string;  // ข้อความเพิ่มเติมกรณีเลือกห้อง "อื่น ๆ"

  // ข้อมูลผู้ยื่นคำขอตามแบบฟอร์ม
  requesterPrefix: NamePrefixType;
  requesterPrefixLabel: 'นาย' | 'นาง' | 'นางสาว';
  requesterName: string;
  requesterFullName: string;
  requesterPosition: string;
  requesterDepartment: string;
  requesterPhone: string;

  // รายละเอียดการใช้งาน
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  attendeeCount: number;

  // ครุภัณฑ์และข้อตกลง
  amenities: BookingAmenitySelection[];
  termsAccepted: boolean;

  // สถานะและประวัติการอนุมัติ
  status: BookingWorkflowStatus;
  approvals: ApprovalRecordItem[];

  user: {
    id: string;
    name: string;
    department: string | null;
    position?: string;
    phone?: string;
  };
  room?: {
    id: string;
    name: string;
    colorCode: string;
    floor: string;
    capacity: number;
  };
  createdAt: string;
}

export interface InitialSlotSelection {
  roomId: string;
  dateStr: string;   // YYYY-MM-DD
  startHour: string; // เช่น "09:00"
  endHour: string;   // เช่น "11:00"
}
