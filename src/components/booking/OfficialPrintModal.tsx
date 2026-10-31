// src/components/booking/OfficialPrintModal.tsx
'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import {
  ApprovalRecordItem,
  BookingItemDTO,
  RoomOption,
} from '@/types/booking';
import {
  formatThaiShortDateBE,
  OFFICIAL_TERMS_TEXT,
} from '@/constants/master-data';
import StatusBadge from '@/components/common/StatusBadge';

interface OfficialPrintModalProps {
  booking: BookingItemDTO | null;
  rooms: RoomOption[];
  onClose: () => void;
}

const OFFICIAL_STANDARD_ROOMS = [
  { id: 'room-adireksarn', name: 'หอประชุมอดิเรกสาร' },
  { id: 'room-sakthong', name: 'ห้องประชุมสักทอง' },
  { id: 'room-director', name: 'ห้องประชุมหน้าห้องผู้อำนวยการ' },
  { id: 'room-coffee', name: 'ห้องประชุม (กาแฟ)' },
  { id: 'room-dome', name: 'อาคารโดมเอนกประสงค์' },
  { id: 'room-computer-av', name: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)' },
];

const OFFICIAL_STANDARD_EQUIPMENT = [
  { code: 'PROJECTOR', label: 'เครื่องฉายภาพ (Projector)' },
  { code: 'SOUND', label: 'ระบบเสียง' },
  { code: 'MIC', label: 'ไมโครโฟน' },
  { code: 'AIRCON', label: 'เครื่องปรับอากาศ' },
  { code: 'INTERNET', label: 'อินเทอร์เน็ต' },
];

function SignatureDisplay({
  record,
  fallbackDots = '.......................................................',
}: {
  record?: ApprovalRecordItem;
  fallbackDots?: string;
}) {
  if (!record || !record.signatureData) {
    return <p className="pt-3">ลงชื่อ {fallbackDots}</p>;
  }

  // กรณีวาดลายเซ็นผ่าน Canvas (Base64 PNG)
  if (record.signatureData.startsWith('data:image/')) {
    return (
      <div className="flex flex-col items-center justify-center pt-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={record.signatureData}
          alt={`ลายเซ็น ${record.approverName}`}
          className="h-11 object-contain"
        />
      </div>
    );
  }

  // กรณีใช้ตราประทับลายเซ็นดิจิทัล (STAMP::ชื่อ::สถานะ)
  const parts = record.signatureData.split('::');
  const signedName = parts[1] || record.approverName;
  const stampLabel = parts[2] || 'ลงนามอิเล็กทรอนิกส์';

  return (
    <div className="my-1 inline-flex flex-col items-center rounded border border-blue-800/60 bg-blue-50/60 px-3 py-1 text-blue-950">
      <span className="font-serif text-xs italic font-bold">{signedName}</span>
      <span className="text-[9px] font-semibold tracking-wide text-blue-800">
        [E-SIGNATURE: {stampLabel}]
      </span>
    </div>
  );
}

export default function OfficialPrintModal({
  booking,
  onClose,
}: OfficialPrintModalProps) {
  if (!booking) return null;

  const createdDate = new Date(booking.createdAt || booking.startTime);
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const createdDay = createdDate.getDate();
  const createdMonth = createdDate.toLocaleDateString('th-TH', {
    month: 'long',
  });
  const createdYearBE = createdDate.getFullYear() + 543;

  const startDay = startDate.getDate();
  const startMonth = startDate.toLocaleDateString('th-TH', { month: 'long' });
  const startYearBE = startDate.getFullYear() + 543;

  const endDay = endDate.getDate();
  const endMonth = endDate.toLocaleDateString('th-TH', { month: 'long' });
  const endYearBE = endDate.getFullYear() + 543;

  const startTimeStr = startDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTimeStr = endDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const selectedRoomIds =
    booking.roomIds && booking.roomIds.length > 0
      ? booking.roomIds
      : [booking.roomId];
  const isOtherRoomChecked = selectedRoomIds.includes('room-other');

  const amenityList = booking.amenities || [];
  const hasAmenityCode = (code: string) =>
    amenityList.some((a) => a.amenityCode === code);
  const extraChairsItem = amenityList.find(
    (a) => a.amenityCode === 'EXTRA_CHAIRS'
  );
  const otherAmenityItem = amenityList.find((a) => a.amenityCode === 'OTHER');

  // ดึงข้อมูลการลงนามทั้ง 3 ลำดับขั้นจาก State Machine
  const inspectionRecord = booking.approvals?.find(
    (a) => a.step === 'ROOM_INSPECTION'
  );
  const headRecord = booking.approvals?.find(
    (a) => a.step === 'HEAD_ENDORSEMENT'
  );
  const execRecord = booking.approvals?.find(
    (a) => a.step === 'EXECUTIVE_DECISION'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative my-6 w-full max-w-4xl rounded-2xl bg-white p-8 text-black shadow-2xl">
        {/* แถบควบคุมด้านบน (ซ่อนเวลาสั่ง Print) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                เอกสารราชการ A4: แบบคำขออนุญาตใช้ห้องประชุม ({booking.documentNo})
              </h3>
              <StatusBadge status={booking.status} size="xs" />
            </div>
            <p className="text-xs text-slate-500">
              รองรับการพิมพ์ลงกระดาษขนาด A4 หรือเลือก Destination เป็น &ldquo;Save as PDF&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500"
            >
              <Printer className="h-4 w-4" /> พิมพ์แบบฟอร์ม A4 / Export PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* แผ่นเอกสารราชการ A4 (Official Government Form Layout)           */}
        {/* =============================================================== */}
        <div
          id="official-a4-print-sheet"
          className="mx-auto max-w-[210mm] space-y-3 font-serif text-[13.5px] leading-relaxed text-black"
        >
          {/* เลขที่เอกสารมุมขวาบน */}
          <div className="flex items-start justify-between text-xs">
            <span className="text-slate-600">
              งานศูนย์ดิจิทัลและสื่อสารองค์กร
            </span>
            <span className="rounded border border-black px-2.5 py-0.5 font-mono font-bold">
              เลขที่คำขอ: {booking.documentNo || booking.id}
            </span>
          </div>

          <div className="space-y-0.5 text-center">
            <h2 className="text-lg font-bold">แบบคำขออนุญาตใช้ห้องประชุม</h2>
            <h3 className="text-base font-bold">
              วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </h3>
          </div>

          <div className="text-right">
            เขียนวันที่ {createdDay} เดือน {createdMonth} พ.ศ. {createdYearBE}
          </div>

          <div className="space-y-0.5">
            <div>
              <strong>เรื่อง</strong> ขออนุญาตใช้ห้องประชุม
            </div>
            <div>
              <strong>เรียน</strong> ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </div>
          </div>

          {/* 1. ข้อมูลผู้ขอใช้งาน */}
          <div className="space-y-1.5 indent-8">
            <p>
              ข้าพเจ้า{' '}
              <span className="inline-block min-w-[200px] border-b border-dotted border-black px-2 text-center font-semibold">
                {booking.requesterFullName || booking.user.name}
              </span>{' '}
              ตำแหน่ง{' '}
              <span className="inline-block min-w-[180px] border-b border-dotted border-black px-2 text-center font-semibold">
                {booking.requesterPosition || 'ครู / บุคลากร'}
              </span>
            </p>
            <p className="indent-0">
              หน่วยงาน / สาขาวิชา{' '}
              <span className="inline-block min-w-[220px] border-b border-dotted border-black px-2 text-center font-semibold">
                {booking.requesterDepartment || booking.user.department}
              </span>{' '}
              หมายเลขโทรศัพท์{' '}
              <span className="inline-block min-w-[140px] border-b border-dotted border-black px-2 text-center font-semibold">
                {booking.requesterPhone || '-'}
              </span>
            </p>
          </div>

          {/* 2. ห้องประชุมที่ต้องการจอง */}
          <div className="pt-1">
            <p className="font-bold">มีความประสงค์ขออนุญาตใช้ห้องประชุม</p>
            <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1.5">
              {OFFICIAL_STANDARD_ROOMS.map((r) => {
                const isSelected = selectedRoomIds.includes(r.id);
                return (
                  <div key={r.id} className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center border border-black text-xs font-bold">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{r.name}</span>
                  </div>
                );
              })}
              <div className="col-span-3 flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center border border-black text-xs font-bold">
                  {isOtherRoomChecked ? '✓' : ''}
                </span>
                <span>
                  อื่น ๆ{' '}
                  <span className="inline-block min-w-[280px] border-b border-dotted border-black px-2 font-semibold">
                    {isOtherRoomChecked ? booking.customRoomNote : ''}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. รายละเอียดการใช้งาน */}
          <div className="space-y-1.5 pt-1">
            <div>
              เพื่อใช้ในการดำเนินงาน เรื่อง{' '}
              <span className="inline-block min-w-[420px] border-b border-dotted border-black px-3 font-semibold">
                {booking.title}
              </span>
            </div>
            <div>
              กำหนดการใช้งานตั้งแต่วันที่{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startDay}
              </span>{' '}
              เดือน{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startMonth}
              </span>{' '}
              พ.ศ.{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startYearBE}
              </span>{' '}
              ถึงวันที่{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endDay}
              </span>{' '}
              เดือน{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endMonth}
              </span>{' '}
              พ.ศ.{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endYearBE}
              </span>
            </div>
            <div>
              ตั้งแต่เวลา{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {startTimeStr}
              </span>{' '}
              น. ถึงเวลา{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {endTimeStr}
              </span>{' '}
              น. จำนวนผู้เข้าใช้ (โดยประมาณ){' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {booking.attendeeCount}
              </span>{' '}
              คน
            </div>
          </div>

          {/* 4. ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวก */}
          <div className="pt-1">
            <p className="font-bold">
              ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวกที่ขอใช้
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {OFFICIAL_STANDARD_EQUIPMENT.map((eq) => {
                const isChecked = hasAmenityCode(eq.code);
                return (
                  <div key={eq.code} className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                      {isChecked ? '✓' : ''}
                    </span>
                    <span>{eq.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                  {extraChairsItem ? '✓' : ''}
                </span>
                <span>
                  โต๊ะ/เก้าอี้เพิ่มเติม{' '}
                  <span className="inline-block min-w-[50px] border-b border-dotted border-black px-2 text-center font-semibold">
                    {extraChairsItem?.quantity || '-'}
                  </span>{' '}
                  ตัว
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                  {otherAmenityItem ? '✓' : ''}
                </span>
                <span>
                  อื่น ๆ{' '}
                  <span className="inline-block min-w-[240px] border-b border-dotted border-black px-2 font-semibold">
                    {otherAmenityItem?.customNote || ''}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 5. คำรับรอง */}
          <div className="flex items-center gap-2 pt-1 text-[13px]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
            <p className="font-medium">{OFFICIAL_TERMS_TEXT}</p>
          </div>

          {/* ตารางลงนาม 4 ช่องตามสายบังคับบัญชาจริง */}
          <div className="mt-3 grid grid-cols-2 border border-black text-center text-xs">
            {/* ช่อง 1: ผู้ยื่นคำขอ */}
            <div className="space-y-1.5 border-b border-r border-black p-3.5">
              <p className="font-bold">1. ผู้ยื่นคำขอ</p>
              <div className="my-1 inline-flex flex-col items-center rounded border border-slate-400 px-3 py-1">
                <span className="font-serif text-xs italic font-semibold">
                  {booking.requesterFullName}
                </span>
                <span className="text-[9px] text-slate-600">
                  [ยื่นคำขอผ่านระบบดิจิทัล]
                </span>
              </div>
              <p>({booking.requesterFullName})</p>
              <p>ตำแหน่ง {booking.requesterPosition}</p>
              <p>วันที่ {formatThaiShortDateBE(createdDate)}</p>
            </div>

            {/* ช่อง 2: เจ้าหน้าที่ผู้ตรวจสอบห้อง (Role 2) */}
            <div className="space-y-1.5 border-b border-black p-3.5">
              <p className="font-bold">2. เจ้าหน้าที่ผู้ตรวจสอบห้อง</p>
              <div className="flex justify-center gap-4 pt-0.5 font-semibold">
                <span>
                  {inspectionRecord?.readinessStatus === 'READY' ? '☑' : '☐'}{' '}
                  พร้อมใช้งาน
                </span>
                <span>
                  {inspectionRecord?.readinessStatus === 'NOT_READY'
                    ? '☑'
                    : '☐'}{' '}
                  ไม่พร้อมใช้งาน
                </span>
              </div>
              <p className="px-2 text-left text-[11px]">
                หมายเหตุ:{' '}
                <span className="border-b border-dotted border-black px-1">
                  {inspectionRecord?.remarks ||
                    '..................................................'}
                </span>
              </p>
              <SignatureDisplay record={inspectionRecord} />
              <p>
                ({inspectionRecord?.approverName || 'นายวัชรพงศ์ โสภา'})
              </p>
              <p className="text-[11px]">
                เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร
              </p>
              <p>
                วันที่{' '}
                {inspectionRecord
                  ? formatThaiShortDateBE(inspectionRecord.actedAt)
                  : '........../........../..........'}
              </p>
            </div>

            {/* ช่อง 3: หัวหน้างาน/ผู้รับรอง (Role 3) */}
            <div className="space-y-1.5 border-r border-black p-3.5">
              <p className="font-bold">3. หัวหน้างาน / ผู้รับรอง</p>
              {headRecord?.remarks && (
                <p className="text-[11px] italic">
                  &ldquo;{headRecord.remarks}&rdquo;
                </p>
              )}
              <SignatureDisplay record={headRecord} />
              <p>({headRecord?.approverName || 'นายเอกราช เขียวทอง'})</p>
              <p className="text-[11px]">
                หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร
              </p>
              <p>
                วันที่{' '}
                {headRecord
                  ? formatThaiShortDateBE(headRecord.actedAt)
                  : '........../........../..........'}
              </p>
            </div>

            {/* ช่อง 4: ผู้พิจารณาอนุมัติ (Role 4) */}
            <div className="space-y-1.5 p-3.5">
              <p className="font-bold">4. ความเห็นผู้พิจารณาอนุมัติ</p>
              <div className="flex justify-center gap-5 pt-0.5 font-bold">
                <span>
                  {execRecord?.decision === 'APPROVED' ? '☑' : '☐'} อนุมัติ
                </span>
                <span>
                  {execRecord?.decision === 'REJECTED' ? '☑' : '☐'} ไม่อนุมัติ
                </span>
              </div>
              {execRecord?.remarks && (
                <p className="px-2 text-left text-[11px]">
                  หมายเหตุ: {execRecord.remarks}
                </p>
              )}
              <SignatureDisplay record={execRecord} />
              <p>({execRecord?.approverName || 'นายชาตรี เริงชัยภูมิ'})</p>
              <p className="text-[11px]">
                รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน
              </p>
              <p>
                วันที่{' '}
                {execRecord
                  ? formatThaiShortDateBE(execRecord.actedAt)
                  : '........../........../..........'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
