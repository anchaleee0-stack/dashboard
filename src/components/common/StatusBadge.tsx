// src/components/common/StatusBadge.tsx
'use client';

import React from 'react';
import {
  Clock,
  ClipboardCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Ban,
  Radio,
  Wrench,
} from 'lucide-react';
import { BookingWorkflowStatus } from '@/types/booking';

interface StatusBadgeProps {
  status: BookingWorkflowStatus;
  size?: 'xs' | 'sm' | 'md';
  showStepIndicator?: boolean;
}

const STATUS_CONFIG: Record<
  BookingWorkflowStatus,
  {
    label: string;
    shortStep: string;
    classes: string;
    dotColor: string;
    Icon: React.ElementType;
  }
> = {
  PENDING_INSPECTION: {
    label: 'รอเจ้าหน้าที่ตรวจห้อง',
    shortStep: 'ขั้น 1/3',
    classes: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    dotColor: 'bg-amber-400',
    Icon: Clock,
  },
  INSPECTED_READY: {
    label: 'ตรวจห้องแล้ว (พร้อมใช้) • รอรับรอง',
    shortStep: 'ขั้น 2/3',
    classes: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    dotColor: 'bg-sky-400',
    Icon: ClipboardCheck,
  },
  INSPECTED_NOT_READY: {
    label: 'ห้องไม่พร้อมใช้งาน • รอพิจารณา',
    shortStep: 'ขั้น 2/3',
    classes: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    dotColor: 'bg-orange-400',
    Icon: AlertTriangle,
  },
  ENDORSED: {
    label: 'หัวหน้างานรับรองแล้ว • รออนุมัติ',
    shortStep: 'ขั้น 3/3',
    classes: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
    dotColor: 'bg-violet-400',
    Icon: FileCheck2,
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    shortStep: 'สมบูรณ์',
    classes: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    dotColor: 'bg-emerald-400',
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: 'ไม่อนุมัติ',
    shortStep: 'สิ้นสุด',
    classes: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    dotColor: 'bg-rose-400',
    Icon: XCircle,
  },
  CANCELLED: {
    label: 'ยกเลิกคำขอ',
    shortStep: 'ยกเลิก',
    classes: 'border-slate-600/50 bg-slate-800/70 text-slate-400',
    dotColor: 'bg-slate-500',
    Icon: Ban,
  },
};

export default function StatusBadge({
  status,
  size = 'sm',
  showStepIndicator = false,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_INSPECTION;
  const IconComp = cfg.Icon;

  const sizeClass =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2.5 py-0.5 text-[11px] gap-1.5';

  const iconSize = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${cfg.classes} ${sizeClass}`}
    >
      <IconComp className={`${iconSize} shrink-0`} />
      <span>{cfg.label}</span>
      {showStepIndicator && (
        <span className="ml-0.5 rounded-full bg-black/25 px-1.5 py-0.2 text-[9px] font-bold opacity-90">
          {cfg.shortStep}
        </span>
      )}
    </span>
  );
}

export function RoomLiveStatusBadge({
  status,
}: {
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}) {
  if (status === 'AVAILABLE') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> พร้อมใช้งาน
      </span>
    );
  }
  if (status === 'OCCUPIED') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <Radio className="h-3 w-3 animate-pulse text-rose-400" /> กำลังใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
      <Wrench className="h-3 w-3" /> ไม่พร้อมใช้งาน
    </span>
  );
}
