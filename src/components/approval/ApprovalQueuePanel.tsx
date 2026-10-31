// src/components/approval/ApprovalQueuePanel.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  FileSignature,
  CheckCircle2,
  XCircle,
  Printer,
  Clock,
  Users,
  Building2,
  Phone,
  Wrench,
  AlertTriangle,
  Loader2,
  X,
  Ban,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import {
  ApprovalRecordItem,
  BookingItemDTO,
  RoleUserProfile,
} from '@/types/booking';
import { formatThaiShortDateBE } from '@/constants/master-data';
import {
  getAvailableActionsForRole,
  getStatusFilterGroup,
  resolveWorkflowTransition,
  WorkflowActionType,
} from '@/services/workflow.service';
import StatusBadge from '@/components/common/StatusBadge';
import DigitalSignaturePad from '@/components/approval/DigitalSignaturePad';

interface ApprovalQueuePanelProps {
  bookings: BookingItemDTO[];
  currentUser: RoleUserProfile;
  onBookingUpdated: (updated: BookingItemDTO, actionMessage: string) => void;
  onPrintBooking: (booking: BookingItemDTO) => void;
}

export default function ApprovalQueuePanel({
  bookings,
  currentUser,
  onBookingUpdated,
  onPrintBooking,
}: ApprovalQueuePanelProps) {
  const [activeTab, setActiveTab] = useState<'ACTION_QUEUE' | 'ALL_REQUESTS'>(
    'ACTION_QUEUE'
  );
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING' | 'INSPECTED' | 'APPROVED' | 'INACTIVE'
  >('ALL');

  // State สำหรับ Modal กดตรวจสอบ/รับรอง/อนุมัติ
  const [selectedBooking, setSelectedBooking] = useState<BookingItemDTO | null>(
    null
  );
  const [selectedAction, setSelectedAction] =
    useState<WorkflowActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // คัดกรองรายการที่รอการดำเนินการจาก Role ปัจจุบัน
  const roleQueueBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (currentUser.role === 'ROOM_INSPECTOR') {
        return b.status === 'PENDING_INSPECTION';
      }
      if (currentUser.role === 'DEPARTMENT_HEAD') {
        return (
          b.status === 'INSPECTED_READY' || b.status === 'INSPECTED_NOT_READY'
        );
      }
      if (currentUser.role === 'EXECUTIVE_APPROVER') {
        return b.status === 'ENDORSED';
      }
      if (currentUser.role === 'REQUESTER') {
        return (
          b.user.id === currentUser.id ||
          b.requesterFullName === currentUser.fullName
        );
      }
      return b.status !== 'CANCELLED' && b.status !== 'REJECTED';
    });
  }, [bookings, currentUser]);

  const filteredAllBookings = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (statusFilter === 'ALL') return sorted;
    return sorted.filter(
      (b) => getStatusFilterGroup(b.status) === statusFilter
    );
  }, [bookings, statusFilter]);

  const displayedList =
    activeTab === 'ACTION_QUEUE' ? roleQueueBookings : filteredAllBookings;

  const openActionModal = (
    booking: BookingItemDTO,
    defaultAction: WorkflowActionType
  ) => {
    setSelectedBooking(booking);
    setSelectedAction(defaultAction);
    setRemarks('');
    setSignatureData(
      `STAMP::${currentUser.fullName}::${defaultAction}`
    );
    setActionError(null);
  };

  const closeActionModal = () => {
    setSelectedBooking(null);
    setSelectedAction(null);
    setRemarks('');
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !selectedAction) return;
    setActionError(null);

    if (
      (selectedAction === 'INSPECT_NOT_READY' || selectedAction === 'REJECT') &&
      remarks.trim().length < 3
    ) {
      setActionError(
        selectedAction === 'INSPECT_NOT_READY'
          ? 'กรุณาระบุเหตุผลที่ห้องหรืออุปกรณ์ไม่พร้อมใช้งานอย่างน้อย 3 ตัวอักษร'
          : 'กรุณาระบุเหตุผลประกอบการไม่อนุมัติคำขอ'
      );
      return;
    }

    if (selectedAction !== 'CANCEL' && !signatureData) {
      setActionError('กรุณาลงลายมือชื่อดิจิทัลหรือเลือกตราประทับก่อนยืนยัน');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorPosition: currentUser.position,
      actorRole: currentUser.role,
      action: selectedAction,
      remarks: remarks.trim() || undefined,
      signatureData: signatureData || undefined,
    };

    const runClientStaticTransition = () => {
      try {
        const isOwner =
          selectedBooking.user.id === currentUser.id ||
          selectedBooking.requesterFullName === currentUser.fullName;
        const resolved = resolveWorkflowTransition({
          currentStatus: selectedBooking.status,
          action: selectedAction,
          actorRole: currentUser.role,
          isOwner,
        });

        const nextApprovals = [...(selectedBooking.approvals || [])];
        if (resolved.approvalStep && resolved.decision) {
          const newRec: ApprovalRecordItem = {
            id: `apv-${Date.now().toString(36)}`,
            step: resolved.approvalStep,
            approverRole: currentUser.role,
            approverId: currentUser.id,
            approverName: currentUser.fullName,
            approverPosition: currentUser.position,
            decision: resolved.decision,
            readinessStatus: resolved.readinessStatus,
            remarks: remarks.trim() || undefined,
            signatureData:
              signatureData ||
              `STAMP::${currentUser.fullName}::${resolved.actionLabel}`,
            actedAt: new Date().toISOString(),
          };
          const idx = nextApprovals.findIndex(
            (a) => a.step === resolved.approvalStep
          );
          if (idx >= 0) nextApprovals[idx] = newRec;
          else nextApprovals.push(newRec);
        }

        const updatedBooking: BookingItemDTO = {
          ...selectedBooking,
          status: resolved.nextStatus,
          approvals: nextApprovals,
        };

        onBookingUpdated(updatedBooking, resolved.actionLabel);
        closeActionModal();
      } catch (err: any) {
        setActionError(err.message || 'ไม่สามารถเปลี่ยนสถานะคำขอได้');
      }
    };

    try {
      const res = await fetch(
        `/api/bookings/${selectedBooking.id}/approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.status === 404 || res.status === 405) {
        runClientStaticTransition();
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error || 'เกิดข้อผิดพลาดในการบันทึกผล');
        return;
      }

      onBookingUpdated(json.data, json.message || 'บันทึกผลการพิจารณาสำเร็จ');
      closeActionModal();
    } catch {
      runClientStaticTransition();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/75 shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300 ring-1 ring-violet-500/30">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {currentUser.role === 'REQUESTER'
                  ? 'ติดตามสถานะคำขอใช้ห้องประชุม (Request & Workflow Tracker)'
                  : 'คิวตรวจสอบ รับรอง และพิจารณาอนุมัติ (Approval / Action Queue)'}
              </h2>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                ผู้ปฏิบัติงาน: {currentUser.fullName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              สายการอนุมัติ 4 บทบาท: ผู้ยื่นคำขอ → เจ้าหน้าที่ตรวจห้อง (พร้อม/ไม่พร้อม) → หัวหน้างานรับรอง → รองผู้อำนวยการอนุมัติ
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('ACTION_QUEUE')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'ACTION_QUEUE'
                  ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>
                {currentUser.role === 'REQUESTER'
                  ? 'คำขอของฉัน'
                  : 'รอดำเนินการตามสิทธิ์'}
              </span>
              <span className="rounded-full bg-cyan-500 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-950">
                {roleQueueBookings.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL_REQUESTS')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'ALL_REQUESTS'
                  ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>รายการทั้งหมด</span>
              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold text-slate-300">
                {bookings.length}
              </span>
            </button>
          </div>

          {activeTab === 'ALL_REQUESTS' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              <option value="ALL">ทุกสถานะ ({bookings.length})</option>
              <option value="PENDING">รอตรวจสอบห้อง</option>
              <option value="INSPECTED">ตรวจสอบแล้ว / รับรองแล้ว</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="INACTIVE">ไม่อนุมัติ / ยกเลิก</option>
            </select>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="divide-y divide-slate-800/70">
        {displayedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400/60" />
            <p className="mt-3 text-sm font-semibold text-slate-300">
              ไม่มีรายการค้างในคิวสำหรับมุมมองนี้
            </p>
            <p className="mt-1 text-xs text-slate-500">
              คุณสามารถสลับแท็บเป็น &ldquo;รายการทั้งหมด&rdquo; หรือสลับ Role ด้านบนเพื่อทดสอบขั้นตอนถัดไปได้ทันที
            </p>
          </div>
        ) : (
          displayedList.map((booking) => {
            const isOwner =
              booking.user.id === currentUser.id ||
              booking.requesterFullName === currentUser.fullName;
            const availableActions = getAvailableActionsForRole(
              booking.status,
              currentUser.role,
              isOwner
            );

            const inspectionRec = booking.approvals?.find(
              (a) => a.step === 'ROOM_INSPECTION'
            );
            const headRec = booking.approvals?.find(
              (a) => a.step === 'HEAD_ENDORSEMENT'
            );
            const execRec = booking.approvals?.find(
              (a) => a.step === 'EXECUTIVE_DECISION'
            );

            const startDate = new Date(booking.startTime);
            const endDate = new Date(booking.endTime);
            const timeRange = `${startDate.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${endDate.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            })} น.`;

            const roomDisplayNames =
              booking.rooms && booking.rooms.length > 0
                ? booking.rooms
                    .map((r) =>
                      r.isCustomRoom && booking.customRoomNote
                        ? `อื่น ๆ (${booking.customRoomNote})`
                        : r.name
                    )
                    .join(', ')
                : booking.room?.name || 'ห้องประชุม';

            return (
              <div
                key={booking.id}
                className="p-6 transition-colors hover:bg-slate-800/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
                        {booking.documentNo || booking.id}
                      </span>
                      <StatusBadge
                        status={booking.status}
                        showStepIndicator
                      />
                      <span className="rounded-lg bg-slate-800/90 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {roomDisplayNames}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">
                      เรื่อง: {booking.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        {formatThaiShortDateBE(startDate)} ({timeRange})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        ผู้เข้าใช้ {booking.attendeeCount} คน
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                        {booking.requesterFullName} ({booking.requesterPosition} •{' '}
                        {booking.requesterDepartment})
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Phone className="h-3.5 w-3.5" />
                        {booking.requesterPhone}
                      </span>
                    </div>

                    {/* รายการครุภัณฑ์ที่ขอใช้ */}
                    {booking.amenities && booking.amenities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Wrench className="h-3.5 w-3.5 text-slate-400 mr-1" />
                        {booking.amenities.map((am) => (
                          <span
                            key={am.amenityCode}
                            className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[11px] text-slate-300"
                          >
                            {am.amenityName}
                            {am.quantity ? ` (${am.quantity} ตัว)` : ''}
                            {am.customNote ? `: ${am.customNote}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Role 2 Actions: เจ้าหน้าที่ตรวจสอบห้อง */}
                    {availableActions.includes('INSPECT_READY') && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal(booking, 'INSPECT_READY')
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                        >
                          <ClipboardCheck className="h-4 w-4" /> พร้อมใช้งาน
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal(booking, 'INSPECT_NOT_READY')
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/50 bg-orange-500/15 px-3.5 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500/25"
                        >
                          <AlertTriangle className="h-4 w-4" /> ไม่พร้อมใช้งาน
                        </button>
                      </>
                    )}

                    {/* Role 3 Actions: หัวหน้างานกดรับรอง */}
                    {availableActions.includes('ENDORSE') && (
                      <>
                        <button
                          type="button"
                          onClick={() => openActionModal(booking, 'ENDORSE')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-500"
                        >
                          <FileSignature className="h-4 w-4" /> ลงนามรับรองคำขอ
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal(booking, 'REJECT')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25"
                        >
                          <XCircle className="h-4 w-4" /> ไม่รับรอง
                        </button>
                      </>
                    )}

                    {/* Role 4 Actions: รองผู้อำนวยการพิจารณาอนุมัติ */}
                    {availableActions.includes('APPROVE') && (
                      <>
                        <button
                          type="button"
                          onClick={() => openActionModal(booking, 'APPROVE')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5"
                        >
                          <CheckCircle2 className="h-4 w-4" /> อนุมัติคำขอ
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal(booking, 'REJECT')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25"
                        >
                          <XCircle className="h-4 w-4" /> ไม่อนุมัติ
                        </button>
                      </>
                    )}

                    {/* Role 1 Owner Cancel */}
                    {availableActions.includes('CANCEL') &&
                      currentUser.role === 'REQUESTER' && (
                        <button
                          type="button"
                          onClick={() => openActionModal(booking, 'CANCEL')}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
                        >
                          <Ban className="h-3.5 w-3.5" /> ยกเลิกคำขอ
                        </button>
                      )}

                    {/* Print / Export Official A4 Form */}
                    <button
                      type="button"
                      onClick={() => onPrintBooking(booking)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        booking.status === 'APPROVED'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {booking.status === 'APPROVED'
                        ? 'พิมพ์ใบอนุมัติ A4'
                        : 'ดูแบบฟอร์ม A4'}
                    </button>
                  </div>
                </div>

                {/* 4-Step Approval Pipeline Timeline */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                  {/* Step 1: ผู้ยื่นคำขอ */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span>1. ผู้ยื่นคำขอ</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-0.5 text-slate-200">
                      {booking.requesterFullName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      ยื่นเมื่อ {formatThaiShortDateBE(booking.createdAt)}
                    </p>
                  </div>

                  {/* Step 2: เจ้าหน้าที่ผู้ตรวจสอบห้อง */}
                  <div
                    className={`rounded-xl border p-2.5 text-[11px] ${
                      inspectionRec
                        ? inspectionRec.readinessStatus === 'READY'
                          ? 'border-emerald-500/25 bg-emerald-950/15'
                          : 'border-orange-500/35 bg-orange-950/20'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span
                        className={
                          inspectionRec
                            ? inspectionRec.readinessStatus === 'READY'
                              ? 'text-emerald-300'
                              : 'text-orange-300'
                            : 'text-slate-400'
                        }
                      >
                        2. ตรวจความพร้อมห้อง
                      </span>
                      {inspectionRec && (
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">
                          {inspectionRec.readinessStatus === 'READY'
                            ? '☑ พร้อมใช้'
                            : '☒ ไม่พร้อม'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-slate-200">
                      {inspectionRec
                        ? inspectionRec.approverName
                        : 'รอเจ้าหน้าที่ตรวจสอบ...'}
                    </p>
                    {inspectionRec?.remarks && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        หมายเหตุ: {inspectionRec.remarks}
                      </p>
                    )}
                  </div>

                  {/* Step 3: หัวหน้างาน/ผู้รับรอง */}
                  <div
                    className={`rounded-xl border p-2.5 text-[11px] ${
                      headRec
                        ? headRec.decision === 'ENDORSED'
                          ? 'border-sky-500/30 bg-sky-950/20'
                          : 'border-rose-500/35 bg-rose-950/20'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span
                        className={
                          headRec
                            ? headRec.decision === 'ENDORSED'
                              ? 'text-sky-300'
                              : 'text-rose-300'
                            : 'text-slate-400'
                        }
                      >
                        3. หัวหน้างาน/ผู้รับรอง
                      </span>
                      {headRec && (
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">
                          {headRec.decision === 'ENDORSED'
                            ? 'รับรองแล้ว'
                            : 'ไม่รับรอง'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-slate-200">
                      {headRec ? headRec.approverName : 'รอหัวหน้างานรับรอง...'}
                    </p>
                    {headRec?.remarks && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        ความเห็น: {headRec.remarks}
                      </p>
                    )}
                  </div>

                  {/* Step 4: ผู้พิจารณาอนุมัติ */}
                  <div
                    className={`rounded-xl border p-2.5 text-[11px] ${
                      execRec
                        ? execRec.decision === 'APPROVED'
                          ? 'border-emerald-500/35 bg-emerald-950/25'
                          : 'border-rose-500/35 bg-rose-950/20'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span
                        className={
                          execRec
                            ? execRec.decision === 'APPROVED'
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                            : 'text-slate-400'
                        }
                      >
                        4. รองผู้อำนวยการฯ
                      </span>
                      {execRec && (
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">
                          {execRec.decision === 'APPROVED'
                            ? '✓ อนุมัติ'
                            : '✗ ไม่อนุมัติ'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-slate-200">
                      {execRec
                        ? execRec.approverName
                        : 'รอการพิจารณาขั้นสุดท้าย...'}
                    </p>
                    {execRec?.remarks && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        คำสั่ง: {execRec.remarks}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =================================================================== */}
      {/* Action & Digital Signature Modal                                    */}
      {/* =================================================================== */}
      {selectedBooking && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            onClick={closeActionModal}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          />

          <form
            onSubmit={handleConfirmAction}
            className="relative z-10 w-full max-w-xl space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  {currentUser.roleBadgeLabel}
                </span>
                <h3 className="mt-0.5 text-base font-bold text-white">
                  {selectedAction === 'INSPECT_READY' &&
                    'บันทึกผลตรวจห้อง: พร้อมใช้งาน'}
                  {selectedAction === 'INSPECT_NOT_READY' &&
                    'บันทึกผลตรวจห้อง: ไม่พร้อมใช้งาน (ระบุเหตุผล)'}
                  {selectedAction === 'ENDORSE' &&
                    'ลงนามรับรองคำขออนุญาตใช้ห้องประชุม'}
                  {selectedAction === 'APPROVE' &&
                    'พิจารณาอนุมัติคำขออนุญาตใช้ห้องประชุม (ขั้นสุดท้าย)'}
                  {selectedAction === 'REJECT' && 'บันทึกผลการไม่อนุมัติคำขอ'}
                  {selectedAction === 'CANCEL' && 'ยืนยันการยกเลิกคำขอใช้ห้องประชุม'}
                </h3>
                <p className="text-xs text-slate-400">
                  เลขที่เอกสาร {selectedBooking.documentNo} • เรื่อง:{' '}
                  {selectedBooking.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeActionModal}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* แจ้งเตือนกรณีหัวหน้างาน/ผู้บริหารเปิดดูรายการที่เจ้าหน้าที่แจ้งว่าห้องไม่พร้อม */}
            {selectedBooking.status === 'INSPECTED_NOT_READY' &&
              selectedAction !== 'CANCEL' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-xs text-orange-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <div>
                    <p className="font-bold">
                      เจ้าหน้าที่ตรวจห้องแจ้งว่า: ห้อง/อุปกรณ์ไม่พร้อมใช้งาน
                    </p>
                    <p className="mt-0.5 opacity-90">
                      เหตุผล:{' '}
                      {selectedBooking.approvals?.find(
                        (a) => a.step === 'ROOM_INSPECTION'
                      )?.remarks || '-'}
                    </p>
                  </div>
                </div>
              )}

            {/* สำหรับ Role 2 สลับเลือก พร้อมใช้งาน / ไม่พร้อมใช้งาน ได้สะดวกในหน้าต่างเดียว */}
            {(selectedAction === 'INSPECT_READY' ||
              selectedAction === 'INSPECT_NOT_READY') && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedAction('INSPECT_READY')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    selectedAction === 'INSPECT_READY'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" /> ☑ พร้อมใช้งาน
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAction('INSPECT_NOT_READY')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    selectedAction === 'INSPECT_NOT_READY'
                      ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" /> ☐ ไม่พร้อมใช้งาน
                </button>
              </div>
            )}

            {/* ช่องกรอกหมายเหตุ / เหตุผล */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                {selectedAction === 'INSPECT_NOT_READY'
                  ? 'ระบุเหตุผลที่ไม่พร้อมใช้งาน (บังคับกรอก) *'
                  : selectedAction === 'REJECT'
                  ? 'ระบุเหตุผลการไม่อนุมัติ (บังคับกรอก) *'
                  : 'หมายเหตุ / ความเห็นเพิ่มเติม (ถ้ามี)'}
              </label>
              <textarea
                rows={2}
                placeholder={
                  selectedAction === 'INSPECT_NOT_READY'
                    ? 'เช่น เครื่องปรับอากาศอยู่ระหว่างซ่อมบำรุง หรือ โปรเจคเตอร์ชำรุด...'
                    : selectedAction === 'APPROVE'
                    ? 'เช่น อนุมัติให้ใช้ห้องประชุมได้ตามเสนอ...'
                    : 'ระบุหมายเหตุเพิ่มเติม...'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Digital Signature / Stamp Pad */}
            {selectedAction !== 'CANCEL' && (
              <DigitalSignaturePad
                signerName={currentUser.fullName}
                signerPosition={currentUser.position}
                defaultStampAction={
                  selectedAction === 'INSPECT_READY'
                    ? 'ตรวจแล้ว พร้อมใช้งาน'
                    : selectedAction === 'INSPECT_NOT_READY'
                    ? 'ตรวจแล้ว ไม่พร้อมใช้งาน'
                    : selectedAction === 'ENDORSE'
                    ? 'รับรองคำขอ'
                    : selectedAction === 'APPROVE'
                    ? 'อนุมัติ'
                    : 'ไม่อนุมัติ'
                }
                value={signatureData}
                onChange={setSignatureData}
              />
            )}

            {actionError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={closeActionModal}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50 ${
                  selectedAction === 'REJECT' ||
                  selectedAction === 'CANCEL' ||
                  selectedAction === 'INSPECT_NOT_READY'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> ยืนยันบันทึกผลและลงนาม
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
