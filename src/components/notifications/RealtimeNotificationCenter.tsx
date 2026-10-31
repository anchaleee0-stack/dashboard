// src/components/notifications/RealtimeNotificationCenter.tsx
'use client';

import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  X,
  CalendarPlus,
  CalendarX2,
  AlarmClock,
  Sparkles,
} from 'lucide-react';
import {
  RealtimeToastItem,
  RealtimeToastType,
} from '@/hooks/useRealtimeBookings';

interface NotificationBellProps {
  notifications: RealtimeToastItem[];
  unreadCount: number;
  pushPermission: NotificationPermission;
  onRequestPushPermission: () => void;
  onMarkAllRead: () => void;
}

export function NotificationBellDropdown({
  notifications,
  unreadCount,
  pushPermission,
  onRequestPushPermission,
  onMarkAllRead,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getIconByType = (type: RealtimeToastType) => {
    switch (type) {
      case 'MEETING_REMINDER':
        return <AlarmClock className="h-4 w-4 text-amber-400 animate-bounce" />;
      case 'BOOKING_CANCELLED':
        return <CalendarX2 className="h-4 w-4 text-rose-400" />;
      default:
        return <CalendarPlus className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) onMarkAllRead();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:text-white"
        title="ศูนย์การแจ้งเตือนแบบเรียลไทม์"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 animate-pulse text-cyan-400" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/40">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 z-50 w-80 sm:w-96 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">การแจ้งเตือนล่าสุด</h4>
              </div>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <CheckCheck className="h-3.5 w-3.5" /> อ่านทั้งหมด
              </button>
            </div>

            {/* แถบขออนุญาตเปิด Web Push Notification บนเบราว์เซอร์ */}
            {pushPermission !== 'granted' && (
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-cyan-500/10 px-4 py-2.5 text-xs">
                <span className="text-cyan-200">
                  เปิดแจ้งเตือนล่วงหน้า 15 นาทีบนเดสก์ท็อป
                </span>
                <button
                  type="button"
                  onClick={onRequestPushPermission}
                  className="rounded-lg bg-cyan-500 px-2.5 py-1 font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  อนุญาต
                </button>
              </div>
            )}

            <div className="max-h-80 divide-y divide-slate-800/60 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-800/40"
                  >
                    <div className="mt-0.5 rounded-xl bg-slate-800 p-2">
                      {getIconByType(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {item.createdAt.toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Floating Toast Stack มุมขวาล่าง แสดงผลทันทีเมื่อมีคนจอง/ยกเลิก หรือเตือนก่อนประชุม 15 นาที
 */
export function RealtimeToastStack({
  toasts,
  onDismiss,
}: {
  toasts: RealtimeToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isReminder = toast.type === 'MEETING_REMINDER';
        const isCancelled = toast.type === 'BOOKING_CANCELLED';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${
              isReminder
                ? 'border-amber-400/60 bg-slate-900/95 shadow-[0_15px_40px_-10px_rgba(245,158,11,0.45)]'
                : isCancelled
                ? 'border-rose-500/50 bg-slate-900/95 shadow-[0_15px_40px_-10px_rgba(244,63,94,0.35)]'
                : 'border-emerald-500/50 bg-slate-900/95 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.35)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  isReminder
                    ? 'bg-amber-500/20 text-amber-300 ring-amber-400/40'
                    : isCancelled
                    ? 'bg-rose-500/20 text-rose-300 ring-rose-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/40'
                }`}
              >
                {isReminder ? (
                  <AlarmClock className="h-5 w-5 animate-bounce" />
                ) : isCancelled ? (
                  <CalendarX2 className="h-5 w-5" />
                ) : (
                  <CalendarPlus className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isReminder
                        ? 'text-amber-300'
                        : isCancelled
                        ? 'text-rose-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {toast.title}
                  </span>
                  {isReminder && toast.minutesLeft && (
                    <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-200 border border-amber-400/30">
                      อีก {toast.minutesLeft} นาที
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
