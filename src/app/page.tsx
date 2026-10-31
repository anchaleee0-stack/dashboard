// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Wifi,
  FileSpreadsheet,
  FolderKanban,
  Printer,
  GraduationCap,
  UserCog,
  CalendarDays,
  FileSignature,
  LayoutDashboard,
} from 'lucide-react';
import { GOOGLE_WORKSPACE_CONFIG } from '@/lib/google-config';
import DashboardOverview, {
  DashboardMetrics,
} from '@/components/dashboard/DashboardOverview';
import RoomTimelineCalendar from '@/components/calendar/RoomTimelineCalendar';
import BookingWizardModal from '@/components/booking/BookingWizardModal';
import OfficialPrintModal from '@/components/booking/OfficialPrintModal';
import ApprovalQueuePanel from '@/components/approval/ApprovalQueuePanel';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import {
  NotificationBellDropdown,
  RealtimeToastStack,
} from '@/components/notifications/RealtimeNotificationCenter';
import {
  OFFICIAL_ROOMS,
  ROLE_DEMO_USERS,
} from '@/constants/master-data';
import {
  BookingItemDTO,
  InitialSlotSelection,
  RoleUserProfile,
  RoomOption,
} from '@/types/booking';
import { BLOCKING_BOOKING_STATUSES } from '@/services/workflow.service';

export default function MeetingBookingDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const yearBE = new Date().getFullYear() + 543;

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rooms] = useState<RoomOption[]>(OFFICIAL_ROOMS);
  const [currentUser, setCurrentUser] = useState<RoleUserProfile>(
    ROLE_DEMO_USERS[0]
  );
  const [activeMainView, setActiveMainView] = useState<
    'ALL' | 'CALENDAR' | 'APPROVAL_QUEUE'
  >('ALL');

  const initialDemoBookings: BookingItemDTO[] = useMemo(
    () => [
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
            remarks: 'ตรวจสอบระบบโปรเจคเตอร์และไมโครโฟนเรียบร้อย พร้อมใช้งาน',
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
        },
        createdAt: new Date(`${todayStr}T08:00:00`).toISOString(),
      },
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
            remarks: 'คอมพิวเตอร์และเครือข่ายพร้อมใช้งาน จัดเก้าอี้เสริม 10 ตัวแล้ว',
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
            remarks: 'เห็นควรเสนอรองผู้อำนวยการพิจารณาอนุมัติ',
            signatureData: 'STAMP::นายเอกราช เขียวทอง::รับรองคำขอ',
            actedAt: new Date(`${todayStr}T09:45:00`).toISOString(),
          },
        ],
        user: {
          id: 'usr-requester-01',
          name: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
          department: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
        },
        createdAt: new Date(`${todayStr}T09:00:00`).toISOString(),
      },
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
            remarks: 'ห้องประชุมหน้าห้องผู้อำนวยการพร้อมใช้งาน',
            signatureData: 'STAMP::นายวัชรพงศ์ โสภา::ตรวจห้องเรียบร้อย',
            actedAt: new Date(`${todayStr}T10:15:00`).toISOString(),
          },
        ],
        user: {
          id: 'usr-teacher-03',
          name: 'นางวิไลพร ทองดี',
          department: 'งานประกันคุณภาพและมาตรฐานการศึกษา',
        },
        createdAt: new Date(`${todayStr}T09:50:00`).toISOString(),
      },
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
        },
        createdAt: new Date(`${todayStr}T10:30:00`).toISOString(),
      },
    ],
    [todayStr, yearBE]
  );

  const {
    bookings,
    toasts,
    notifications,
    unreadCount,
    isConnected,
    pushPermission,
    requestPushPermission,
    dismissToast,
    markAllNotificationsAsRead,
    addBookingOptimistic,
    updateBookingOptimistic,
  } = useRealtimeBookings({
    currentUserId: currentUser.id,
    selectedDate,
    initialBookings: initialDemoBookings,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] =
    useState<InitialSlotSelection | null>(null);
  const [printingBooking, setPrintingBooking] =
    useState<BookingItemDTO | null>(null);

  // นับจำนวนรายการที่รอดำเนินการในแต่ละ Role เพื่อแสดง Badge บนแถบสลับสิทธิ์
  const rolePendingCounts = useMemo(() => {
    return {
      REQUESTER: bookings.filter(
        (b) =>
          b.user.id === ROLE_DEMO_USERS[0].id ||
          b.requesterFullName === ROLE_DEMO_USERS[0].fullName
      ).length,
      ROOM_INSPECTOR: bookings.filter(
        (b) => b.status === 'PENDING_INSPECTION'
      ).length,
      DEPARTMENT_HEAD: bookings.filter(
        (b) =>
          b.status === 'INSPECTED_READY' || b.status === 'INSPECTED_NOT_READY'
      ).length,
      EXECUTIVE_APPROVER: bookings.filter((b) => b.status === 'ENDORSED')
        .length,
    };
  }, [bookings]);

  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = Date.now();
    const standardRooms = rooms.filter((r) => !r.isCustomRoom);
    const activeRooms = standardRooms.filter((r) => r.isActive);
    const maintenanceRooms = standardRooms.length - activeRooms.length;

    const occupiedRoomIds = new Set<string>();
    bookings.forEach((b) => {
      const s = new Date(b.startTime).getTime();
      const e = new Date(b.endTime).getTime();
      if (b.status === 'APPROVED' && now >= s && now < e) {
        (b.roomIds?.length ? b.roomIds : [b.roomId]).forEach((rid) =>
          occupiedRoomIds.add(rid)
        );
      }
    });

    const availableRoomsNow = Math.max(
      0,
      activeRooms.length - occupiedRoomIds.size
    );
    const activePipelineBookings = bookings.filter((b) =>
      BLOCKING_BOOKING_STATUSES.includes(b.status)
    );

    return {
      availableRoomsNow,
      totalActiveRooms: activeRooms.length,
      maintenanceRooms,
      bookingsToday: activePipelineBookings.length,
      bookingsDeltaPercent: 22,
      occupancyRate: Math.min(
        100,
        Math.round(
          (activePipelineBookings.length / Math.max(1, activeRooms.length)) *
            100
        )
      ),
      peakHourRange: '09:00 - 15:30 น.',
      hourlyTrend: [
        { hour: '08:00', bookings: 1, occupancy: 20 },
        { hour: '09:00', bookings: 4, occupancy: 75 },
        { hour: '10:00', bookings: 5, occupancy: 90 },
        { hour: '11:00', bookings: 4, occupancy: 80 },
        { hour: '12:00', bookings: 1, occupancy: 15 },
        { hour: '13:00', bookings: 4, occupancy: 75 },
        { hour: '14:00', bookings: 5, occupancy: 88 },
        { hour: '15:00', bookings: 5, occupancy: 85 },
        { hour: '16:00', bookings: 3, occupancy: 55 },
        { hour: '17:00', bookings: 1, occupancy: 20 },
      ],
      roomUsageRanking: standardRooms.map((r, i) => ({
        roomName: r.name.replace('ห้องประชุม', '').trim().slice(0, 14),
        hoursUsed: [28, 24, 16, 14, 18, 22][i] || 10,
        colorCode: r.colorCode,
        status: !r.isActive
          ? 'MAINTENANCE'
          : occupiedRoomIds.has(r.id)
          ? 'OCCUPIED'
          : 'AVAILABLE',
      })),
    };
  }, [rooms, bookings]);

  const handleSelectEmptySlot = (slot: InitialSlotSelection) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      <RealtimeToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Institutional Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <GraduationCap className="h-3.5 w-3.5" /> งานศูนย์ดิจิทัลและสื่อสารองค์กร
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">
                <Wifi
                  className={`h-3 w-3 ${
                    isConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                {isConnected ? 'Real-time Socket Connected' : 'Digital Workflow Active'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              ระบบจองห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              ผู้ตรวจสอบห้อง: นายวัชรพงศ์ โสภา • หัวหน้างาน/ผู้รับรอง: นายเอกราช เขียวทอง • ผู้พิจารณาอนุมัติ: นายชาตรี เริงชัยภูมิ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/20"
            >
              <FileSpreadsheet className="h-4 w-4" /> Google Sheet
            </a>

            <a
              href={GOOGLE_WORKSPACE_CONFIG.DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2.5 text-xs font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:bg-blue-500/20"
            >
              <FolderKanban className="h-4 w-4" /> Google Drive
            </a>

            {bookings.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPrintingBooking(
                    bookings.find((b) => b.status === 'APPROVED') || bookings[0]
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:bg-amber-500/20"
              >
                <Printer className="h-4 w-4" /> พิมพ์ฟอร์มราชการ A4
              </button>
            )}

            <NotificationBellDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              pushPermission={pushPermission}
              onRequestPushPermission={requestPushPermission}
              onMarkAllRead={markAllNotificationsAsRead}
            />

            <button
              type="button"
              onClick={() =>
                handleSelectEmptySlot({
                  roomId: rooms[0].id,
                  dateStr: selectedDate,
                  startHour: '09:00',
                  endHour: '11:00',
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/40"
            >
              <Plus className="h-4 w-4" /> ยื่นคำขอใช้ห้องประชุม
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* Role Switcher & Navigation Bar (สลับบทบาททั้ง 4 Roles ตามสายเซ็นจริง) */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 mr-1">
              <UserCog className="h-4 w-4 text-cyan-400" /> บทบาทผู้ใช้งาน (Role):
            </span>
            {ROLE_DEMO_USERS.map((roleUser) => {
              const isSelected = currentUser.id === roleUser.id;
              const badgeCount =
                rolePendingCounts[
                  roleUser.role as keyof typeof rolePendingCounts
                ] || 0;

              return (
                <button
                  key={roleUser.id}
                  type="button"
                  onClick={() => setCurrentUser(roleUser)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <p className="font-bold leading-tight">
                      {roleUser.roleBadgeLabel}
                    </p>
                    <p className="text-[10px] opacity-80">{roleUser.fullName}</p>
                  </div>
                  {badgeCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-cyan-300'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick View Mode Switcher */}
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setActiveMainView('ALL')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeMainView === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> ภาพรวมทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setActiveMainView('CALENDAR')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeMainView === 'CALENDAR'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> ปฏิทินห้องว่าง
            </button>
            <button
              type="button"
              onClick={() => setActiveMainView('APPROVAL_QUEUE')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeMainView === 'APPROVAL_QUEUE'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSignature className="h-3.5 w-3.5" /> คิวตรวจสอบ/อนุมัติ
            </button>
          </div>
        </div>

        {/* 1. Executive KPI & Charts */}
        {activeMainView === 'ALL' && (
          <DashboardOverview metrics={dashboardMetrics} />
        )}

        {/* 2. Calendar & Real-time Availability View */}
        {(activeMainView === 'ALL' || activeMainView === 'CALENDAR') && (
          <RoomTimelineCalendar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            rooms={rooms}
            bookings={bookings}
            onSelectEmptySlot={handleSelectEmptySlot}
            onSelectBooking={(booking) => setPrintingBooking(booking)}
          />
        )}

        {/* 3. Approval / Action Queue & Workflow Tracker */}
        {(activeMainView === 'ALL' || activeMainView === 'APPROVAL_QUEUE') && (
          <ApprovalQueuePanel
            bookings={bookings}
            currentUser={currentUser}
            onBookingUpdated={updateBookingOptimistic}
            onPrintBooking={(booking) => setPrintingBooking(booking)}
          />
        )}

        {/* 4. Step-by-Step Booking Wizard Modal (React Hook Form + Zod) */}
        <BookingWizardModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          rooms={rooms}
          existingBookings={bookings}
          initialSlot={selectedSlot}
          currentUser={currentUser}
          onBookingSuccess={(newBooking) => {
            addBookingOptimistic(newBooking);
            setPrintingBooking(newBooking);
          }}
        />

        {/* 5. Official A4 Government PDF Print / Export Modal */}
        <OfficialPrintModal
          booking={printingBooking}
          rooms={rooms}
          onClose={() => setPrintingBooking(null)}
        />
      </main>
    </div>
  );
}
