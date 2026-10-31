// src/services/workflow.service.ts
import {
  ApprovalDecisionType,
  ApprovalStepType,
  BookingItemDTO,
  BookingWorkflowStatus,
  InspectionReadinessType,
  UserRoleType,
} from '@/types/booking';

export type WorkflowActionType =
  | 'INSPECT_READY'
  | 'INSPECT_NOT_READY'
  | 'ENDORSE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL';

export interface WorkflowTransitionRule {
  fromStatuses: BookingWorkflowStatus[];
  allowedRoles: UserRoleType[];
  nextStatus: BookingWorkflowStatus;
  approvalStep?: ApprovalStepType;
  decision?: ApprovalDecisionType;
  readinessStatus?: InspectionReadinessType;
  actionLabel: string;
}

export class WorkflowTransitionError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'WorkflowTransitionError';
    this.statusCode = statusCode;
  }
}

/**
 * ตารางกฎ State Machine ตามสายบังคับบัญชาจริง วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์
 * Role 1 (ผู้ยื่นคำขอ) -> Role 2 (เจ้าหน้าที่ผู้ตรวจสอบห้อง) -> Role 3 (หัวหน้างาน/ผู้รับรอง) -> Role 4 (รองผู้อำนวยการฯ)
 */
export const WORKFLOW_TRANSITION_RULES: Record<
  WorkflowActionType,
  WorkflowTransitionRule
> = {
  INSPECT_READY: {
    fromStatuses: ['PENDING_INSPECTION'],
    allowedRoles: ['ROOM_INSPECTOR', 'ADMIN'],
    nextStatus: 'INSPECTED_READY',
    approvalStep: 'ROOM_INSPECTION',
    decision: 'READY',
    readinessStatus: 'READY',
    actionLabel: 'บันทึกผลตรวจห้อง: พร้อมใช้งาน',
  },
  INSPECT_NOT_READY: {
    fromStatuses: ['PENDING_INSPECTION'],
    allowedRoles: ['ROOM_INSPECTOR', 'ADMIN'],
    nextStatus: 'INSPECTED_NOT_READY',
    approvalStep: 'ROOM_INSPECTION',
    decision: 'NOT_READY',
    readinessStatus: 'NOT_READY',
    actionLabel: 'บันทึกผลตรวจห้อง: ไม่พร้อมใช้งาน',
  },
  ENDORSE: {
    fromStatuses: ['INSPECTED_READY', 'INSPECTED_NOT_READY'],
    allowedRoles: ['DEPARTMENT_HEAD', 'ADMIN'],
    nextStatus: 'ENDORSED',
    approvalStep: 'HEAD_ENDORSEMENT',
    decision: 'ENDORSED',
    actionLabel: 'หัวหน้างานลงนามรับรองคำขอ',
  },
  APPROVE: {
    fromStatuses: ['ENDORSED'],
    allowedRoles: ['EXECUTIVE_APPROVER', 'ADMIN'],
    nextStatus: 'APPROVED',
    approvalStep: 'EXECUTIVE_DECISION',
    decision: 'APPROVED',
    actionLabel: 'พิจารณาอนุมัติให้ใช้ห้องประชุม',
  },
  REJECT: {
    fromStatuses: ['INSPECTED_READY', 'INSPECTED_NOT_READY', 'ENDORSED'],
    allowedRoles: ['DEPARTMENT_HEAD', 'EXECUTIVE_APPROVER', 'ADMIN'],
    nextStatus: 'REJECTED',
    decision: 'REJECTED',
    actionLabel: 'ไม่อนุมัติคำขอ',
  },
  CANCEL: {
    fromStatuses: [
      'PENDING_INSPECTION',
      'INSPECTED_READY',
      'INSPECTED_NOT_READY',
      'ENDORSED',
      'APPROVED',
    ],
    allowedRoles: ['REQUESTER', 'ADMIN'],
    nextStatus: 'CANCELLED',
    actionLabel: 'ยกเลิกคำขอใช้ห้องประชุม',
  },
};

/**
 * สถานะที่ถือว่ากำลังถือครองสิทธิ์ช่วงเวลาห้องประชุม (ใช้สำหรับ Conflict Detection ป้องกันการจองซ้อน)
 */
export const BLOCKING_BOOKING_STATUSES: BookingWorkflowStatus[] = [
  'PENDING_INSPECTION',
  'INSPECTED_READY',
  'ENDORSED',
  'APPROVED',
];

/**
 * ฟังก์ชันตรวจสอบการจองซ้อน (Interval Overlap Detection) ที่ใช้ได้ทั้งฝั่ง Client และ Server
 * สูตรคณิตศาสตร์: Existing.Start < New.End AND Existing.End > New.Start
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
 * ตรวจสอบสิทธิ์และความถูกต้องของการเปลี่ยนสถานะ (State Transition Guard)
 */
export function resolveWorkflowTransition(params: {
  currentStatus: BookingWorkflowStatus;
  action: WorkflowActionType;
  actorRole: UserRoleType;
  isOwner?: boolean;
}): {
  nextStatus: BookingWorkflowStatus;
  approvalStep?: ApprovalStepType;
  decision?: ApprovalDecisionType;
  readinessStatus?: InspectionReadinessType;
  actionLabel: string;
} {
  const { currentStatus, action, actorRole, isOwner = false } = params;
  const rule = WORKFLOW_TRANSITION_RULES[action];

  if (!rule) {
    throw new WorkflowTransitionError(`ไม่พบคำสั่งการทำงาน "${action}"`, 400);
  }

  // 1. ตรวจสอบว่าสถานะปัจจุบันอนุญาตให้ทำ Action นี้หรือไม่
  if (!rule.fromStatuses.includes(currentStatus)) {
    throw new WorkflowTransitionError(
      `ไม่สามารถทำรายการ "${rule.actionLabel}" ในสถานะปัจจุบัน (${currentStatus}) ได้`,
      400
    );
  }

  // 2. ตรวจสอบสิทธิ์ตาม Role
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new WorkflowTransitionError(
      `สิทธิ์ผู้ใช้งานของคุณ (${actorRole}) ไม่ได้รับอนุญาตให้ทำรายการ "${rule.actionLabel}"`,
      403
    );
  }

  // 3. กรณีผู้ยื่นคำขอกดยกเลิก ต้องเป็นเจ้าของใบคำขอนั้นเท่านั้น (ยกเว้น ADMIN)
  if (action === 'CANCEL' && actorRole === 'REQUESTER' && !isOwner) {
    throw new WorkflowTransitionError(
      'ผู้ยื่นคำขอสามารถยกเลิกได้เฉพาะคำขอของตนเองเท่านั้น',
      403
    );
  }

  // กำหนด Step สำหรับกรณี REJECT ตาม Role ของผู้กดไม่อนุมัติ
  let approvalStep = rule.approvalStep;
  if (action === 'REJECT') {
    approvalStep =
      actorRole === 'DEPARTMENT_HEAD' ? 'HEAD_ENDORSEMENT' : 'EXECUTIVE_DECISION';
  }

  return {
    nextStatus: rule.nextStatus,
    approvalStep,
    decision: rule.decision,
    readinessStatus: rule.readinessStatus,
    actionLabel: rule.actionLabel,
  };
}

/**
 * คืนรายการ Action ที่ Role ปัจจุบันสามารถกดดำเนินการได้ในใบคำขอนั้น
 */
export function getAvailableActionsForRole(
  status: BookingWorkflowStatus,
  role: UserRoleType,
  isOwner = false
): WorkflowActionType[] {
  const actions: WorkflowActionType[] = [];

  (Object.keys(WORKFLOW_TRANSITION_RULES) as WorkflowActionType[]).forEach(
    (actionKey) => {
      const rule = WORKFLOW_TRANSITION_RULES[actionKey];
      if (!rule.fromStatuses.includes(status)) return;
      if (!rule.allowedRoles.includes(role)) return;
      if (actionKey === 'CANCEL' && role === 'REQUESTER' && !isOwner) return;
      actions.push(actionKey);
    }
  );

  return actions;
}

/**
 * แปลงสถานะย่อยใน State Machine ให้เป็นหมวดหมู่หลักสำหรับตัวกรองบนปฏิทิน (Calendar Filter)
 * - PENDING: รอตรวจสอบ
 * - INSPECTED: ตรวจสอบแล้ว / รับรองแล้ว (รอผู้บริหารอนุมัติ)
 * - APPROVED: อนุมัติแล้ว
 * - REJECTED_OR_CANCELLED: ไม่อนุมัติ / ยกเลิก
 */
export function getStatusFilterGroup(
  status: BookingWorkflowStatus
): 'PENDING' | 'INSPECTED' | 'APPROVED' | 'INACTIVE' {
  switch (status) {
    case 'PENDING_INSPECTION':
      return 'PENDING';
    case 'INSPECTED_READY':
    case 'INSPECTED_NOT_READY':
    case 'ENDORSED':
      return 'INSPECTED';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
    case 'CANCELLED':
    default:
      return 'INACTIVE';
  }
}
