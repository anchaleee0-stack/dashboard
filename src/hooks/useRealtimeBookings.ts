// src/hooks/useRealtimeBookings.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BookingItemDTO } from '@/types/booking';

export type RealtimeToastType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'MEETING_REMINDER';

export interface RealtimeToastItem {
  id: string;
  type: RealtimeToastType;
  title: string;
  message: string;
  roomName?: string;
  startTime?: string;
  minutesLeft?: number;
  createdAt: Date;
  isRead: boolean;
}

interface UseRealtimeBookingsOptions {
  currentUserId: string;
  selectedDate: string;
  initialBookings?: BookingItemDTO[];
}

export function useRealtimeBookings({
  currentUserId,
  selectedDate,
  initialBookings = [],
}: UseRealtimeBookingsOptions) {
  const [bookings, setBookings] = useState<BookingItemDTO[]>(initialBookings);
  const [toasts, setToasts] = useState<RealtimeToastItem[]>([]);
  const [notifications, setNotifications] = useState<RealtimeToastItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default');

  const remindedBookingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    return permission;
  }, []);

  const triggerBrowserNotification = useCallback(
    (title: string, body: string, tag?: string) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, {
            body,
            tag,
            icon: '/favicon.ico',
          });
        } catch {
          // Fallback เฉพาะ In-app toast
        }
      }
    },
    []
  );

  const pushToast = useCallback(
    (item: Omit<RealtimeToastItem, 'id' | 'createdAt' | 'isRead'>) => {
      const newToast: RealtimeToastItem = {
        ...item,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date(),
        isRead: false,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 4));
      setNotifications((prev) => [newToast, ...prev].slice(0, 30));

      const duration = item.type === 'MEETING_REMINDER' ? 10000 : 5500;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, duration);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // ดึงรายการคำขอและตารางการจองทั้งหมดจาก API
  const refreshBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setBookings(json.data);
        }
      }
    } catch {
      // ใช้ข้อมูลใน State ปัจจุบันหากรันในโหมด Static Export
    }
  }, [selectedDate]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // เชื่อมต่อ Socket.io แบบ Real-time
  useEffect(() => {
    const socket: Socket = io({
      path: '/api/socket/io',
      addTrailingSlash: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2500,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:join', currentUserId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(
      'booking:created',
      (payload: { booking: BookingItemDTO; message: string }) => {
        const { booking, message } = payload;

        setBookings((prev) => {
          if (prev.some((b) => b.id === booking.id)) return prev;
          return [...prev, booking].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        });

        pushToast({
          type: 'BOOKING_CREATED',
          title: 'มีคำขอใช้ห้องประชุมใหม่',
          message:
            message ||
            `${booking.requesterFullName} ยื่นคำขอ "${booking.title}"`,
          roomName: booking.room?.name,
          startTime: booking.startTime,
        });
      }
    );

    socket.on(
      'booking:updated',
      (payload: {
        booking: BookingItemDTO;
        actionLabel: string;
        actorName: string;
      }) => {
        const { booking, actionLabel, actorName } = payload;
        setBookings((prev) =>
          prev.map((item) => (item.id === booking.id ? booking : item))
        );

        pushToast({
          type:
            booking.status === 'REJECTED' || booking.status === 'CANCELLED'
              ? 'BOOKING_CANCELLED'
              : 'BOOKING_CREATED',
          title: `อัปเดตสถานะคำขอ ${booking.documentNo}`,
          message: `${actionLabel} โดย ${actorName}`,
          roomName: booking.room?.name,
        });
      }
    );

    socket.on(
      'booking:cancelled',
      (payload: { bookingId: string; title?: string; roomName?: string }) => {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payload.bookingId ? { ...b, status: 'CANCELLED' } : b
          )
        );

        pushToast({
          type: 'BOOKING_CANCELLED',
          title: 'ยกเลิกคำขอใช้ห้องประชุม',
          message: payload.title
            ? `คำขอ "${payload.title}" ถูกยกเลิก ห้องว่างพร้อมใช้งานแล้ว`
            : 'รายการจองถูกยกเลิก สถานะห้องว่างถูกอัปเดตแล้ว',
          roomName: payload.roomName,
        });
      }
    );

    socket.on(
      'booking:reminder',
      (payload: {
        bookingId: string;
        title: string;
        roomName: string;
        startTime: string;
        minutesLeft: number;
      }) => {
        if (remindedBookingIdsRef.current.has(payload.bookingId)) return;
        remindedBookingIdsRef.current.add(payload.bookingId);

        const alertMsg = `อีก ${payload.minutesLeft} นาทีจะเริ่มประชุม "${payload.title}" ที่ห้อง ${payload.roomName}`;
        pushToast({
          type: 'MEETING_REMINDER',
          title: 'แจ้งเตือนก่อนเริ่มประชุม (15 นาที)',
          message: alertMsg,
          roomName: payload.roomName,
          startTime: payload.startTime,
          minutesLeft: payload.minutesLeft,
        });

        triggerBrowserNotification(
          `⏰ ใกล้เริ่มประชุม: ${payload.title}`,
          alertMsg,
          `reminder-${payload.bookingId}`
        );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, pushToast, triggerBrowserNotification]);

  // Client-side Watchdog แจ้งเตือนล่วงหน้า 15 นาทีสำหรับรายการที่ได้รับอนุมัติแล้ว (APPROVED)
  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const now = Date.now();
      bookings.forEach((booking) => {
        if (booking.status !== 'APPROVED') return;
        if (remindedBookingIdsRef.current.has(booking.id)) return;

        const startMs = new Date(booking.startTime).getTime();
        const diffMinutes = Math.ceil((startMs - now) / (1000 * 60));

        if (diffMinutes > 0 && diffMinutes <= 15) {
          remindedBookingIdsRef.current.add(booking.id);
          const roomName = booking.room?.name || 'ห้องประชุมที่จองไว้';
          const alertMsg = `อีก ${diffMinutes} นาทีจะเริ่ม "${booking.title}" ณ ${roomName}`;

          pushToast({
            type: 'MEETING_REMINDER',
            title: 'แจ้งเตือนก่อนเริ่มประชุม!',
            message: alertMsg,
            roomName,
            startTime: booking.startTime,
            minutesLeft: diffMinutes,
          });

          triggerBrowserNotification(
            `⏰ อีก ${diffMinutes} นาทีเริ่มประชุม`,
            alertMsg,
            `reminder-${booking.id}`
          );
        }
      });
    };

    checkUpcomingMeetings();
    const intervalId = setInterval(checkUpcomingMeetings, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [bookings, pushToast, triggerBrowserNotification]);

  const addBookingOptimistic = useCallback(
    (newBooking: BookingItemDTO) => {
      setBookings((prev) => {
        if (prev.some((b) => b.id === newBooking.id)) return prev;
        return [...prev, newBooking].sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });

      pushToast({
        type: 'BOOKING_CREATED',
        title: `ยื่นคำขอ ${newBooking.documentNo} สำเร็จ`,
        message: `ส่งคำขอ "${newBooking.title}" เข้าสู่คิวตรวจสอบความพร้อมห้องแล้ว`,
        roomName: newBooking.room?.name,
        startTime: newBooking.startTime,
      });
    },
    [pushToast]
  );

  const updateBookingOptimistic = useCallback(
    (updatedBooking: BookingItemDTO, actionMessage: string) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
      );

      pushToast({
        type:
          updatedBooking.status === 'REJECTED' ||
          updatedBooking.status === 'CANCELLED'
            ? 'BOOKING_CANCELLED'
            : 'BOOKING_CREATED',
        title: `บันทึกผลคำขอ ${updatedBooking.documentNo}`,
        message: actionMessage,
        roomName: updatedBooking.room?.name,
      });
    },
    [pushToast]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
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
    refreshBookings,
  };
}
