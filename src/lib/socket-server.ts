// src/lib/socket-server.ts
import { Server as SocketIOServer } from 'socket.io';
import { BookingWorkflowStatus } from '@/types/booking';

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

export type BookingRealtimePayload = {
  id: string;
  documentNo?: string;
  title: string;
  startTime: string;
  endTime: string;
  status: BookingWorkflowStatus;
  attendeeCount: number;
  room: {
    id: string;
    name: string;
    colorCode: string;
    floor: string;
  };
  user: {
    id: string;
    name: string;
    department: string | null;
  };
};

export const SOCKET_EVENTS = {
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_CANCELLED: 'booking:cancelled',
  MEETING_REMINDER: 'booking:reminder',
  NOTIFICATION_NEW: 'notification:new',
} as const;

export function emitRealtimeEvent<T>(
  event: string,
  payload: T,
  roomChannel?: string
) {
  const io = globalThis.io;
  if (!io) {
    return;
  }

  if (roomChannel) {
    io.to(roomChannel).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
