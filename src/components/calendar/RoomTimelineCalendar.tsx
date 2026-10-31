// src/components/calendar/RoomTimelineCalendar.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Layers,
  Printer,
  Filter,
} from 'lucide-react';
import {
  BookingItemDTO,
  InitialSlotSelection,
  RoomOption,
} from '@/types/booking';
import { formatDateInputToBEPreview } from '@/constants/master-data';
import {
  BLOCKING_BOOKING_STATUSES,
  getStatusFilterGroup,
} from '@/services/workflow.service';
import StatusBadge, {
  RoomLiveStatusBadge,
} from '@/components/common/StatusBadge';

export type CalendarBookingItem = BookingItemDTO;

interface RoomTimelineCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  rooms: RoomOption[];
  bookings: BookingItemDTO[];
  onSelectEmptySlot: (slot: InitialSlotSelection) => void;
  onSelectBooking?: (booking: BookingItemDTO) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 ถึง 18:00

export default function RoomTimelineCalendar({
  selectedDate,
  onDateChange,
  rooms,
  bookings,
  onSelectEmptySlot,
  onSelectBooking,
}: RoomTimelineCalendarProps) {
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    'ALL' | 'PENDING' | 'INSPECTED' | 'APPROVED'
  >('ALL');

  const now = new Date();

  // แสดงเฉพาะห้องมาตรฐานบนตาราง Timeline (ไม่รวมตัวเลือก 'อื่น ๆ' เว้นแต่มีการกรอง)
  const displayedRooms = useMemo(() => {
    const standardRooms = rooms.filter((r) => !r.isCustomRoom);
    if (selectedRoomFilter === 'ALL') return standardRooms;
    return standardRooms.filter((r) => r.id === selectedRoomFilter);
  }, [rooms, selectedRoomFilter]);

  // กรองรายการจองที่ทับซ้อนกับวันที่เลือก และตรงตามตัวกรองสถานะ
  const dateFilteredBookings = useMemo(() => {
    const dayStart = new Date(`${selectedDate}T00:00:00`);
    const dayEnd = new Date(`${selectedDate}T23:59:59`);

    return bookings.filter((b) => {
      if (!BLOCKING_BOOKING_STATUSES.includes(b.status)) return false;

      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const overlapsDay = bStart <= dayEnd && bEnd >= dayStart;
      if (!overlapsDay) return false;

      if (selectedStatusFilter !== 'ALL') {
        return getStatusFilterGroup(b.status) === selectedStatusFilter;
      }
      return true;
    });
  }, [bookings, selectedDate, selectedStatusFilter]);

  const getRoomLiveStatus = (
    room: RoomOption
  ): 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' => {
    if (!room.isActive) return 'MAINTENANCE';

    const isCurrentlyOccupied = bookings.some((b) => {
      const targetIds = b.roomIds?.length ? b.roomIds : [b.roomId];
      if (!targetIds.includes(room.id) || b.status !== 'APPROVED') return false;
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      const current = now.getTime();
      return current >= start && current < end;
    });

    return isCurrentlyOccupied ? 'OCCUPIED' : 'AVAILABLE';
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const getBookingPositionStyle = (startISO: string, endISO: string) => {
    const dayStart = new Date(`${selectedDate}T00:00:00`);
    const dayEnd = new Date(`${selectedDate}T23:59:59`);
    const start = new Date(startISO);
    const end = new Date(endISO);

    const startDecimal =
      start < dayStart ? 8 : start.getHours() + start.getMinutes() / 60;
    const endDecimal =
      end > dayEnd ? 19 : end.getHours() + end.getMinutes() / 60;

    const clampedStart = Math.max(8, Math.min(19, startDecimal));
    const clampedEnd = Math.max(8, Math.min(19, endDecimal));

    const leftPercent = ((clampedStart - 8) / 11) * 100;
    const widthPercent = Math.max(((clampedEnd - clampedStart) / 11) * 100, 5);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const currentTimePercent = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    if (selectedDate !== todayStr) return null;
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    if (currentDecimal < 8 || currentDecimal > 19) return null;
    return ((currentDecimal - 8) / 11) * 100;
  }, [now, selectedDate]);

  const getBookingBarColors = (b: BookingItemDTO, isNowActive: boolean) => {
    if (isNowActive && b.status === 'APPROVED') {
      return 'border-rose-400/70 bg-gradient-to-r from-rose-600/95 to-pink-600/90 text-white shadow-rose-500/30';
    }
    if (b.status === 'APPROVED') {
      return 'border-emerald-400/60 bg-gradient-to-r from-emerald-600/90 to-teal-600/85 text-white shadow-emerald-500/25';
    }
    if (b.status === 'ENDORSED' || b.status === 'INSPECTED_READY') {
      return 'border-violet-400/60 bg-gradient-to-r from-violet-600/85 to-indigo-600/85 text-white shadow-violet-500/20';
    }
    return 'border-amber-400/60 bg-gradient-to-r from-amber-600/85 to-orange-600/80 text-white shadow-amber-500/20';
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/75 shadow-2xl backdrop-blur-xl">
      {/* Top Header & Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/30">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                ปฏิทินตรวจสอบห้องว่างและตารางการใช้ห้องประชุม (Real-time Availability)
              </h2>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                {formatDateInputToBEPreview(selectedDate)}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              คลิกช่องเวลาว่างเพื่อยื่นคำขออนุญาตใช้ห้อง หรือคลิกที่แถบการจองเพื่อเปิดดูใบคำขอ A4 (ป้องกันการจองซ้อนอัตโนมัติ)
            </p>
          </div>
        </div>

        {/* Date Picker Controls */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="วันก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent px-2 text-xs font-semibold text-white outline-none"
          />
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="วันถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar: แยกตามห้องประชุม และ สถานะ (รอตรวจสอบ, ตรวจสอบแล้ว, อนุมัติแล้ว) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-slate-950/45 px-6 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Filter className="h-3.5 w-3.5 text-cyan-400" /> ตัวกรองตาราง:
          </span>

          {/* Room Filter */}
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="ALL">ทุกห้องประชุม (6 ห้องหลัก)</option>
            {rooms
              .filter((r) => !r.isCustomRoom)
              .map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} (จุ {room.capacity} คน)
                </option>
              ))}
          </select>

          {/* Status Filter Pills */}
          <div className="inline-flex flex-wrap rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            {[
              { id: 'ALL', label: 'ทุกสถานะ' },
              { id: 'PENDING', label: 'รอตรวจสอบ' },
              { id: 'INSPECTED', label: 'ตรวจสอบแล้ว / รับรองแล้ว' },
              { id: 'APPROVED', label: 'อนุมัติแล้ว' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatusFilter(st.id as any)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedStatusFilter === st.id
                    ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> รอตรวจสอบ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> ตรวจสอบแล้ว/รอผู้บริหาร
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> อนุมัติแล้ว
          </span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-12 border-b border-slate-800/80 bg-slate-950/50 text-xs font-medium text-slate-400">
            <div className="col-span-3 flex items-center gap-2 border-r border-slate-800/80 px-5 py-3">
              <Layers className="h-4 w-4 text-slate-500" />
              <span>ห้องประชุม / ความพร้อม</span>
            </div>
            <div className="col-span-9 grid grid-cols-11">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-r border-slate-800/50 px-2 py-3 text-center font-mono text-[11px] last:border-r-0"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/70">
            {displayedRooms.map((room) => {
              const liveStatus = getRoomLiveStatus(room);
              const roomBookings = dateFilteredBookings.filter((b) => {
                const rIds = b.roomIds?.length ? b.roomIds : [b.roomId];
                return rIds.includes(room.id);
              });

              return (
                <div
                  key={room.id}
                  className={`group/row grid grid-cols-12 transition-colors duration-200 ${
                    liveStatus === 'MAINTENANCE'
                      ? 'bg-amber-950/10'
                      : 'hover:bg-slate-800/25'
                  }`}
                >
                  <div className="col-span-3 flex flex-col justify-between border-r border-slate-800/80 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: room.colorCode }}
                          />
                          <h4 className="text-sm font-semibold text-white transition-colors group-hover/row:text-cyan-300">
                            {room.name}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {room.floor} • ความจุ {room.capacity} คน
                        </p>
                      </div>

                      <RoomLiveStatusBadge status={liveStatus} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 4).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative col-span-9 grid min-h-[96px] grid-cols-11">
                    {currentTimePercent !== null && (
                      <div
                        style={{ left: `${currentTimePercent}%` }}
                        className="pointer-events-none absolute bottom-0 top-0 z-20 w-[2px] bg-rose-500/80 shadow-[0_0_10px_#f43f5e]"
                      />
                    )}

                    {liveStatus === 'MAINTENANCE' ? (
                      <div className="col-span-11 flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.06),rgba(245,158,11,0.06)_10px,rgba(245,158,11,0.12)_10px,rgba(245,158,11,0.12)_20px)] text-xs font-medium text-amber-300/80">
                        <Wrench className="mr-2 h-4 w-4" /> เจ้าหน้าที่ตรวจสอบห้อง: ไม่พร้อมใช้งานชั่วคราว
                      </div>
                    ) : (
                      <>
                        {HOURS.map((hour) => {
                          const startHourStr = `${String(hour).padStart(2, '0')}:00`;
                          const endHourStr = `${String(hour + 1).padStart(2, '0')}:00`;

                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() =>
                                onSelectEmptySlot({
                                  roomId: room.id,
                                  dateStr: selectedDate,
                                  startHour: startHourStr,
                                  endHour: endHourStr,
                                })
                              }
                              className="group/slot relative flex items-center justify-center border-r border-slate-800/40 transition-all duration-200 last:border-r-0 hover:bg-emerald-500/10"
                              title={`คลิกเพื่อขออนุญาตใช้ ${room.name} เวลา ${startHourStr} - ${endHourStr}`}
                            >
                              <span className="flex scale-75 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300 opacity-0 shadow-sm transition-all duration-200 group-hover/slot:scale-100 group-hover/slot:opacity-100">
                                <Plus className="h-3 w-3" /> ขอใช้ห้อง
                              </span>
                            </button>
                          );
                        })}

                        {roomBookings.map((booking) => {
                          const posStyle = getBookingPositionStyle(
                            booking.startTime,
                            booking.endTime
                          );
                          const startTimeFormatted = new Date(
                            booking.startTime
                          ).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const endTimeFormatted = new Date(
                            booking.endTime
                          ).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          const isNowActive =
                            now.getTime() >=
                              new Date(booking.startTime).getTime() &&
                            now.getTime() < new Date(booking.endTime).getTime();

                          return (
                            <div
                              key={`${room.id}-${booking.id}`}
                              style={posStyle}
                              onClick={() =>
                                onSelectBooking && onSelectBooking(booking)
                              }
                              title="คลิกเพื่อดูรายละเอียดและพิมพ์ใบคำขอ A4"
                              className={`group/item absolute bottom-2 top-2 z-10 flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-2.5 text-left shadow-lg transition-all duration-300 hover:z-30 hover:-translate-y-1 hover:shadow-2xl ${getBookingBarColors(
                                booking,
                                isNowActive
                              )}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="truncate text-xs font-bold leading-tight">
                                  {booking.title}
                                </p>
                                <Printer className="h-3 w-3 shrink-0 opacity-80 group-hover/item:opacity-100" />
                              </div>

                              <div className="flex items-center justify-between gap-1 text-[10px] text-white/95">
                                <span className="truncate">
                                  {startTimeFormatted}-{endTimeFormatted} •{' '}
                                  {booking.requesterFullName || booking.user.name}
                                </span>
                                <span className="hidden shrink-0 items-center gap-0.5 sm:inline-flex">
                                  <Users className="h-2.5 w-2.5" />{' '}
                                  {booking.attendeeCount}
                                </span>
                              </div>

                              <div className="mt-0.5 hidden sm:block">
                                <StatusBadge status={booking.status} size="xs" />
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
