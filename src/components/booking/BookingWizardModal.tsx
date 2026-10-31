// src/components/booking/BookingWizardModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Calendar,
  Clock,
  Users,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  UserCheck,
  Phone,
  Briefcase,
  Wrench,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  bookingWizardSchema,
  BookingWizardFormValues,
} from '@/lib/validations/booking';
import {
  formatDateInputToBEPreview,
  OFFICIAL_AMENITIES,
  OFFICIAL_TERMS_TEXT,
  PREFIX_MAP,
} from '@/constants/master-data';
import {
  BookingAmenitySelection,
  BookingItemDTO,
  InitialSlotSelection,
  RoleUserProfile,
  RoomOption,
} from '@/types/booking';
import { findConflictingBookingInList } from '@/services/workflow.service';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomOption[];
  existingBookings: BookingItemDTO[];
  initialSlot: InitialSlotSelection | null;
  currentUser: RoleUserProfile;
  onBookingSuccess: (newBooking: BookingItemDTO) => void;
}

const WIZARD_STEPS = [
  { step: 1, title: 'ข้อมูลผู้ขอใช้งาน', subtitle: 'ชื่อ ตำแหน่ง หน่วยงาน' },
  { step: 2, title: 'ห้องประชุม & วันเวลา', subtitle: 'เช็กห้องว่าง Real-time' },
  { step: 3, title: 'อุปกรณ์ & ข้อตกลง', subtitle: 'ครุภัณฑ์และยืนยันคำขอ' },
];

export default function BookingWizardModal({
  isOpen,
  onClose,
  rooms,
  existingBookings,
  initialSlot,
  currentUser,
  onBookingSuccess,
}: BookingWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingWizardFormValues>({
    resolver: zodResolver(bookingWizardSchema),
    mode: 'onChange',
    defaultValues: {
      requesterPrefix: currentUser.prefix || 'MR',
      requesterName: currentUser.name || '',
      requesterPosition: currentUser.position || '',
      requesterDepartment: currentUser.department || '',
      requesterPhone: currentUser.phone || '',
      roomIds: initialSlot?.roomId ? [initialSlot.roomId] : [rooms[0]?.id || 'room-adireksarn'],
      customRoomNote: '',
      title: '',
      description: '',
      startDateStr: initialSlot?.dateStr || todayStr,
      endDateStr: initialSlot?.dateStr || todayStr,
      startHour: initialSlot?.startHour || '09:00',
      endHour: initialSlot?.endHour || '11:00',
      attendeeCount: 25,
      standardAmenities: ['PROJECTOR', 'SOUND', 'MIC', 'AIRCON', 'INTERNET'],
      extraChairsEnabled: false,
      extraChairsCount: 10,
      otherAmenityEnabled: false,
      otherAmenityText: '',
      termsAccepted: false,
    },
  });

  // ซิงก์ข้อมูลเริ่มต้นเมื่อเปิด Modal หรือเปลี่ยนผู้ใช้งาน/ช่วงเวลาที่คลิกจากปฏิทิน
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setServerError(null);
      reset({
        requesterPrefix: currentUser.prefix || 'MR',
        requesterName: currentUser.name || '',
        requesterPosition: currentUser.position || '',
        requesterDepartment: currentUser.department || '',
        requesterPhone: currentUser.phone || '',
        roomIds: initialSlot?.roomId
          ? [initialSlot.roomId]
          : [rooms[0]?.id || 'room-adireksarn'],
        customRoomNote: '',
        title: '',
        description: '',
        startDateStr: initialSlot?.dateStr || todayStr,
        endDateStr: initialSlot?.dateStr || todayStr,
        startHour: initialSlot?.startHour || '09:00',
        endHour: initialSlot?.endHour || '11:00',
        attendeeCount: 25,
        standardAmenities: ['PROJECTOR', 'SOUND', 'MIC', 'AIRCON', 'INTERNET'],
        extraChairsEnabled: false,
        extraChairsCount: 10,
        otherAmenityEnabled: false,
        otherAmenityText: '',
        termsAccepted: false,
      });
    }
  }, [isOpen, initialSlot, currentUser, rooms, reset, todayStr]);

  const watchedRoomIds = watch('roomIds') || [];
  const watchedStartDate = watch('startDateStr');
  const watchedEndDate = watch('endDateStr');
  const watchedStartHour = watch('startHour');
  const watchedEndHour = watch('endHour');
  const watchedAttendeeCount = watch('attendeeCount');
  const watchedStandardAmenities = watch('standardAmenities') || [];
  const watchedExtraChairsEnabled = watch('extraChairsEnabled');
  const watchedOtherAmenityEnabled = watch('otherAmenityEnabled');
  const watchedTermsAccepted = watch('termsAccepted');

  const selectedRoomObjects = useMemo(
    () => rooms.filter((r) => watchedRoomIds.includes(r.id)),
    [rooms, watchedRoomIds]
  );

  const totalSelectedCapacity = useMemo(
    () => selectedRoomObjects.reduce((acc, r) => acc + r.capacity, 0),
    [selectedRoomObjects]
  );

  const hasCustomRoomSelected = watchedRoomIds.includes('room-other');

  // =========================================================================
  // Real-time Instant Conflict Detection ทันทีที่ผู้ใช้เลือกห้องหรือเปลี่ยนวัน-เวลา
  // =========================================================================
  const liveAvailability = useMemo(() => {
    if (
      !watchedStartDate ||
      !watchedEndDate ||
      !watchedStartHour ||
      !watchedEndHour ||
      watchedRoomIds.length === 0
    ) {
      return { state: 'INCOMPLETE' as const };
    }

    const startDT = new Date(`${watchedStartDate}T${watchedStartHour}:00`);
    const endDT = new Date(`${watchedEndDate}T${watchedEndHour}:00`);

    if (isNaN(startDT.getTime()) || isNaN(endDT.getTime()) || endDT <= startDT) {
      return {
        state: 'INVALID_TIME' as const,
        message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      };
    }

    const conflict = findConflictingBookingInList({
      existingBookings,
      targetRoomIds: watchedRoomIds,
      startTime: startDT,
      endTime: endDT,
    });

    if (conflict) {
      const conflictedRoom = rooms.find(
        (r) => r.id === conflict.conflictedRoomId
      );
      const sTime = new Date(conflict.booking.startTime).toLocaleTimeString(
        'th-TH',
        { hour: '2-digit', minute: '2-digit' }
      );
      const eTime = new Date(conflict.booking.endTime).toLocaleTimeString(
        'th-TH',
        { hour: '2-digit', minute: '2-digit' }
      );
      return {
        state: 'CONFLICT' as const,
        roomName: conflictedRoom?.name || 'ห้องที่เลือก',
        conflictingTitle: conflict.booking.title,
        bookedBy: conflict.booking.requesterFullName,
        timeRange: `${sTime} - ${eTime} น.`,
      };
    }

    if (!hasCustomRoomSelected && Number(watchedAttendeeCount) > totalSelectedCapacity) {
      return {
        state: 'OVER_CAPACITY' as const,
        message: `จำนวนผู้เข้าใช้ (${watchedAttendeeCount} คน) เกินความจุรวมของห้องที่เลือก (สูงสุด ${totalSelectedCapacity} คน)`,
      };
    }

    return { state: 'AVAILABLE' as const };
  }, [
    watchedStartDate,
    watchedEndDate,
    watchedStartHour,
    watchedEndHour,
    watchedRoomIds,
    watchedAttendeeCount,
    existingBookings,
    rooms,
    hasCustomRoomSelected,
    totalSelectedCapacity,
  ]);

  if (!isOpen) return null;

  // Toggle เลือกห้องประชุม (รองรับทั้ง Single และ Multiple Select)
  const handleToggleRoom = (id: string) => {
    const current = watchedRoomIds;
    if (current.includes(id)) {
      if (current.length === 1) return; // ต้องมีอย่างน้อย 1 ห้องเสมอ
      setValue(
        'roomIds',
        current.filter((item) => item !== id),
        { shouldValidate: true }
      );
    } else {
      setValue('roomIds', [...current, id], { shouldValidate: true });
    }
  };

  // Toggle ครุภัณฑ์มาตรฐาน 5 รายการ
  const handleToggleStandardAmenity = (code: string) => {
    const current = watchedStandardAmenities;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    setValue('standardAmenities', next, { shouldValidate: true });
  };

  // ตรวจสอบ Validation ราย Step ก่อนอนุญาตให้ไปขั้นถัดไป
  const handleNextStep = async () => {
    setServerError(null);
    if (currentStep === 1) {
      const valid = await trigger([
        'requesterPrefix',
        'requesterName',
        'requesterPosition',
        'requesterDepartment',
        'requesterPhone',
      ]);
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await trigger([
        'roomIds',
        'customRoomNote',
        'title',
        'startDateStr',
        'endDateStr',
        'startHour',
        'endHour',
        'attendeeCount',
      ]);
      if (!valid) return;
      if (liveAvailability.state === 'CONFLICT') {
        setServerError(
          `ห้อง "${liveAvailability.roomName}" ถูกจองแล้วในช่วงเวลา ${liveAvailability.timeRange} กรุณาเปลี่ยนเวลาหรือเลือกห้องอื่น`
        );
        return;
      }
      if (liveAvailability.state === 'OVER_CAPACITY') {
        setServerError(liveAvailability.message);
        return;
      }
      setCurrentStep(3);
    }
  };

  const onSubmitForm = async (values: BookingWizardFormValues) => {
    setServerError(null);

    if (liveAvailability.state === 'CONFLICT') {
      setServerError(
        `ไม่สามารถบันทึกได้: ห้อง "${liveAvailability.roomName}" มีการจองซ้อนกับ "${liveAvailability.conflictingTitle}"`
      );
      return;
    }

    const startDT = new Date(`${values.startDateStr}T${values.startHour}:00`);
    const endDT = new Date(`${values.endDateStr}T${values.endHour}:00`);

    // แปลงรายการอุปกรณ์ให้อยู่ในรูปแบบ Relational DTO
    const amenitiesPayload: BookingAmenitySelection[] = [];
    OFFICIAL_AMENITIES.forEach((am) => {
      if (
        !am.requiresQuantity &&
        !am.requiresCustomText &&
        values.standardAmenities.includes(am.code)
      ) {
        amenitiesPayload.push({
          amenityCode: am.code,
          amenityName: am.name,
        });
      }
    });

    if (values.extraChairsEnabled && values.extraChairsCount) {
      amenitiesPayload.push({
        amenityCode: 'EXTRA_CHAIRS',
        amenityName: 'โต๊ะ/เก้าอี้เพิ่มเติม',
        quantity: Number(values.extraChairsCount),
      });
    }

    if (values.otherAmenityEnabled && values.otherAmenityText?.trim()) {
      amenitiesPayload.push({
        amenityCode: 'OTHER',
        amenityName: 'อื่น ๆ',
        customNote: values.otherAmenityText.trim(),
      });
    }

    const prefixLabel = PREFIX_MAP[values.requesterPrefix];
    const cleanName = values.requesterName
      .replace(/^(นาย|นางสาว|นาง)\s*/, '')
      .trim();
    const fullRequesterName = `${prefixLabel}${cleanName}`;

    const apiPayload = {
      userId: currentUser.id,
      roomId: values.roomIds[0],
      roomIds: values.roomIds,
      customRoomNote: values.customRoomNote?.trim() || undefined,
      requesterPrefix: values.requesterPrefix,
      requesterName: cleanName,
      requesterPosition: values.requesterPosition.trim(),
      requesterDepartment: values.requesterDepartment.trim(),
      requesterPhone: values.requesterPhone.trim(),
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      attendeeCount: Number(values.attendeeCount),
      startTime: startDT.toISOString(),
      endTime: endDT.toISOString(),
      amenities: amenitiesPayload,
      termsAccepted: values.termsAccepted,
    };

    const runClientStaticFallback = () => {
      const yearBE = new Date().getFullYear() + 543;
      const docNo = `TL-${yearBE}-${String(existingBookings.length + 1).padStart(4, '0')}`;
      const fallbackBooking: BookingItemDTO = {
        id: `bk-${Date.now().toString(36)}`,
        documentNo: docNo,
        roomId: values.roomIds[0],
        roomIds: values.roomIds,
        rooms: selectedRoomObjects,
        room: selectedRoomObjects[0],
        customRoomNote: values.customRoomNote?.trim() || undefined,
        requesterPrefix: values.requesterPrefix,
        requesterPrefixLabel: prefixLabel,
        requesterName: cleanName,
        requesterFullName: fullRequesterName,
        requesterPosition: values.requesterPosition.trim(),
        requesterDepartment: values.requesterDepartment.trim(),
        requesterPhone: values.requesterPhone.trim(),
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        startTime: startDT.toISOString(),
        endTime: endDT.toISOString(),
        attendeeCount: Number(values.attendeeCount),
        amenities: amenitiesPayload,
        termsAccepted: true,
        status: 'PENDING_INSPECTION',
        approvals: [],
        user: {
          id: currentUser.id,
          name: fullRequesterName,
          department: values.requesterDepartment.trim(),
          position: values.requesterPosition.trim(),
          phone: values.requesterPhone.trim(),
        },
        createdAt: new Date().toISOString(),
      };
      onBookingSuccess(fallbackBooking);
      onClose();
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (res.status === 404 || res.status === 405) {
        runClientStaticFallback();
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || 'ไม่สามารถบันทึกคำขอใช้ห้องประชุมได้');
        return;
      }

      onBookingSuccess(json.data);
      onClose();
    } catch {
      runClientStaticFallback();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
      />

      <div className="relative z-10 my-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 text-slate-100 shadow-[0_25px_80px_-15px_rgba(6,182,212,0.3)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                แบบคำขออนุญาตใช้ห้องประชุม (ระบบดิจิทัล)
              </h3>
              <p className="text-xs text-cyan-300/90">
                วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ • เรียน ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {WIZARD_STEPS.map((item) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step < currentStep) {
                    setCurrentStep(item.step as 1 | 2 | 3);
                  }
                }}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                  isActive
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-white shadow-sm'
                    : isDone
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 cursor-pointer'
                    : 'border-slate-800 bg-slate-950/60 text-slate-500 cursor-default'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950'
                      : isDone
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : item.step}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{item.title}</p>
                  <p className="truncate text-[10px] opacity-80">{item.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {serverError && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="font-semibold">{serverError}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className="mt-5 max-h-[65vh] space-y-4 overflow-y-auto pr-1"
        >
          {/* ============================================================== */}
          {/* STEP 1: ข้อมูลผู้ขอใช้งาน                                        */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  หมวดที่ 1: ข้อมูลผู้ขออนุญาตใช้งานห้องประชุม
                </p>
                <span className="text-[11px] text-slate-400">
                  อ้างอิงตามแบบฟอร์มคำขออนุญาต วท.ท่าหลวงฯ
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    คำนำหน้า *
                  </label>
                  <select
                    {...register('requesterPrefix')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    <option value="MR">นาย</option>
                    <option value="MRS">นาง</option>
                    <option value="MS">นางสาว</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <UserCheck className="h-3.5 w-3.5 text-cyan-400" /> ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น กนกวรรณ ศรีสวัสดิ์"
                    {...register('requesterName')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.requesterName && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.requesterName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Briefcase className="h-3.5 w-3.5 text-cyan-400" /> ตำแหน่ง *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ครูชำนาญการ / เจ้าหน้าที่"
                    {...register('requesterPosition')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.requesterPosition && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.requesterPosition.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Building2 className="h-3.5 w-3.5 text-cyan-400" /> หน่วยงาน / สาขาวิชา *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น แผนกวิชาเทคโนโลยีสารสนเทศ"
                    {...register('requesterDepartment')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.requesterDepartment && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.requesterDepartment.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" /> หมายเลขโทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    placeholder="081-234-5678"
                    {...register('requesterPhone')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.requesterPhone && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.requesterPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: ห้องประชุม (Single/Multiple Select) & วัน-เวลา (พ.ศ.)    */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  หมวดที่ 2-3: เลือกห้องประชุม (เลือกได้มากกว่า 1 ห้อง) และกำหนดวัน-เวลา
                </p>
                <span className="text-[11px] text-slate-400">
                  เลือกแล้ว {watchedRoomIds.length} ห้อง • ความจุรวม{' '}
                  {hasCustomRoomSelected ? 'ไม่จำกัด' : `${totalSelectedCapacity} คน`}
                </span>
              </div>

              {/* Room Multi-Select Grid */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {rooms.map((room) => {
                  const isChecked = watchedRoomIds.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      disabled={!room.isActive}
                      onClick={() => handleToggleRoom(room.id)}
                      className={`flex items-start justify-between rounded-xl border p-3 text-left transition-all ${
                        !room.isActive
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900/30 opacity-45'
                          : isChecked
                          ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                            isChecked
                              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                              : 'border-slate-600 bg-slate-950'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                        <div>
                          <p className="text-xs font-bold">{room.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {room.floor} •{' '}
                            {room.isCustomRoom
                              ? 'ระบุรายละเอียดด้านล่าง'
                              : `จุสูงสุด ${room.capacity} คน`}
                          </p>
                        </div>
                      </div>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full mt-1"
                        style={{ backgroundColor: room.colorCode }}
                      />
                    </button>
                  );
                })}
              </div>
              {errors.roomIds && (
                <p className="text-xs text-rose-400">{errors.roomIds.message}</p>
              )}

              {/* ช่องระบุข้อความเพิ่มเติมเมื่อเลือกห้อง "อื่น ๆ" */}
              {hasCustomRoomSelected && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-300">
                    ระบุชื่อห้อง / สถานที่เพิ่มเติม (กรณีเลือก &ldquo;อื่น ๆ&rdquo;) *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ลานกิจกรรมหน้าเสาธง หรือ ห้องปฏิบัติการแผนก..."
                    {...register('customRoomNote')}
                    className="w-full rounded-xl border border-amber-500/50 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                  {errors.customRoomNote && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.customRoomNote.message}
                    </p>
                  )}
                </div>
              )}

              {/* วัตถุประสงค์ */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" /> เพื่อใช้ในการดำเนินงาน เรื่อง (วัตถุประสงค์) *
                </label>
                <input
                  type="text"
                  placeholder="ระบุหัวข้อการประชุม / โครงการ / กิจกรรม"
                  {...register('title')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-rose-400">{errors.title.message}</p>
                )}
              </div>

              {/* วันเริ่มต้น - สิ้นสุด (รองรับแสดงผล พ.ศ.) และ เวลา */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-cyan-400" /> วันที่เริ่มต้น *
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-300">
                      {formatDateInputToBEPreview(watchedStartDate)}
                    </span>
                  </label>
                  <input
                    type="date"
                    {...register('startDateStr', {
                      onChange: (e) => {
                        if (!watchedEndDate || watchedEndDate < e.target.value) {
                          setValue('endDateStr', e.target.value, {
                            shouldValidate: true,
                          });
                        }
                      },
                    })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-cyan-400" /> วันที่สิ้นสุด *
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-300">
                      {formatDateInputToBEPreview(watchedEndDate)}
                    </span>
                  </label>
                  <input
                    type="date"
                    {...register('endDateStr')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  {errors.endDateStr && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.endDateStr.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> เวลาเริ่มต้น (น.) *
                  </label>
                  <input
                    type="time"
                    {...register('startHour')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-rose-400" /> เวลาสิ้นสุด (น.) *
                  </label>
                  <input
                    type="time"
                    {...register('endHour')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.endHour && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.endHour.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-300">
                    <Users className="h-3.5 w-3.5 text-cyan-400" /> จำนวนผู้เข้าใช้ (คน) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register('attendeeCount', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {errors.attendeeCount && (
                    <p className="mt-1 text-xs text-rose-400">
                      {errors.attendeeCount.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Real-time Availability & Conflict Indicator Banner */}
              {liveAvailability.state === 'AVAILABLE' && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    <strong>ตรวจสอบตารางแบบ Real-time:</strong> ห้องประชุมที่เลือกว่างพร้อมให้ยื่นคำขอในช่วงวันและเวลาดังกล่าว
                  </span>
                </div>
              )}

              {liveAvailability.state === 'CONFLICT' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-xs text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <div>
                    <p className="font-bold text-rose-300">
                      พบการจองซ้อนในห้อง &ldquo;{liveAvailability.roomName}&rdquo; ({liveAvailability.timeRange})
                    </p>
                    <p className="mt-0.5 opacity-90">
                      ชนกับรายการ: &ldquo;{liveAvailability.conflictingTitle}&rdquo; โดย{' '}
                      {liveAvailability.bookedBy}
                    </p>
                  </div>
                </div>
              )}

              {(liveAvailability.state === 'INVALID_TIME' ||
                liveAvailability.state === 'OVER_CAPACITY') && (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{liveAvailability.message}</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: ครุภัณฑ์ / อุปกรณ์ & ข้อกำหนดเงื่อนไข                     */}
          {/* ============================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Wrench className="h-3.5 w-3.5" /> หมวดที่ 4: ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวกที่ขอใช้
                </p>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {OFFICIAL_AMENITIES.filter(
                    (a) => !a.requiresQuantity && !a.requiresCustomText
                  ).map((item) => {
                    const checked = watchedStandardAmenities.includes(item.code);
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleToggleStandardAmenity(item.code)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition ${
                          checked
                            ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                            : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                            checked
                              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                              : 'border-slate-600'
                          }`}
                        >
                          {checked ? '✓' : ''}
                        </span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* โต๊ะ/เก้าอี้เพิ่มเติม + อื่น ๆ */}
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200">
                      <input
                        type="checkbox"
                        {...register('extraChairsEnabled')}
                        className="rounded accent-cyan-400"
                      />
                      <span>โต๊ะ/เก้าอี้เพิ่มเติม (ระบุจำนวนตัว)</span>
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        disabled={!watchedExtraChairsEnabled}
                        {...register('extraChairsCount', { valueAsNumber: true })}
                        className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 disabled:opacity-40"
                      />
                      <span className="text-xs text-slate-400">ตัว</span>
                    </div>
                    {errors.extraChairsCount && (
                      <p className="mt-1 text-xs text-rose-400">
                        {errors.extraChairsCount.message}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200">
                      <input
                        type="checkbox"
                        {...register('otherAmenityEnabled')}
                        className="rounded accent-cyan-400"
                      />
                      <span>อื่น ๆ (ระบุข้อความอุปกรณ์เพิ่มเติม)</span>
                    </label>
                    <input
                      type="text"
                      disabled={!watchedOtherAmenityEnabled}
                      placeholder="เช่น โพเดียมพิธีกร, ป้ายไวนิล, ปลั๊กพ่วง..."
                      {...register('otherAmenityText')}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 disabled:opacity-40"
                    />
                    {errors.otherAmenityText && (
                      <p className="mt-1 text-xs text-rose-400">
                        {errors.otherAmenityText.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* หมวดที่ 5: ข้อกำหนดและเงื่อนไข + สายการอนุมัติ */}
              <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <ShieldCheck className="h-4 w-4" /> หมวดที่ 5: ข้อกำหนดและเงื่อนไขการใช้ห้องประชุมราชการ
                </p>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                    watchedTermsAccepted
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-500/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="mt-0.5 h-4 w-4 rounded accent-emerald-400"
                  />
                  <span className="text-xs font-medium leading-relaxed">
                    &ldquo;{OFFICIAL_TERMS_TEXT}&rdquo; *
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p className="text-xs font-semibold text-rose-400">
                    {errors.termsAccepted.message}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2 pt-2 text-[11px] sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="font-bold text-amber-300">
                      ขั้นที่ 1 • เจ้าหน้าที่ผู้ตรวจสอบห้อง
                    </span>
                    <p className="mt-0.5 text-slate-200">นายวัชรพงศ์ โสภา</p>
                    <p className="text-[10px] text-slate-400">
                      ตรวจความพร้อมห้องและอุปกรณ์
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="font-bold text-sky-300">
                      ขั้นที่ 2 • หัวหน้างาน/ผู้รับรอง
                    </span>
                    <p className="mt-0.5 text-slate-200">นายเอกราช เขียวทอง</p>
                    <p className="text-[10px] text-slate-400">
                      หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="font-bold text-violet-300">
                      ขั้นที่ 3 • ผู้พิจารณาอนุมัติ
                    </span>
                    <p className="mt-0.5 text-slate-200">นายชาตรี เริงชัยภูมิ</p>
                    <p className="text-[10px] text-slate-400">
                      รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" /> ย้อนกลับ
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                ยกเลิก
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:-translate-y-0.5"
                >
                  ถัดไป <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    isSubmitting || liveAvailability.state === 'CONFLICT'
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังส่งคำขอ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> ยืนยันยื่นคำขอใช้ห้องประชุม
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
