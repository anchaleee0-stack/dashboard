// src/app/api/bookings/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { workflowTransitionSchema } from '@/lib/validations/booking';
import {
  BookingConflictError,
  BookingRuleError,
  executeBookingWorkflowTransition,
} from '@/services/booking.service';
import { WorkflowTransitionError } from '@/services/workflow.service';
import { emitRealtimeEvent, SOCKET_EVENTS } from '@/lib/socket-server';
import { updateBookingStatusInGoogleSheet } from '@/services/google-sync.service';

/**
 * PATCH /api/bookings/[id]/approve
 * ดำเนินการเปลี่ยนสถานะตามสายบังคับบัญชา (Role 2 ตรวจห้อง -> Role 3 รับรอง -> Role 4 อนุมัติ)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const bookingId = context.params.id;
    const body = await req.json();

    const parsed = workflowTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'ข้อมูลการดำเนินการอนุมัติไม่ครบถ้วน',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { booking, actionLabel } = await executeBookingWorkflowTransition(
      bookingId,
      parsed.data
    );

    emitRealtimeEvent(SOCKET_EVENTS.BOOKING_UPDATED, {
      booking,
      actionLabel,
      actorName: parsed.data.actorName,
      timestamp: new Date().toISOString(),
    });

    await updateBookingStatusInGoogleSheet(
      booking.documentNo || booking.id,
      booking.status
    );

    return NextResponse.json(
      {
        message: `${actionLabel} เรียบร้อยแล้ว`,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof WorkflowTransitionError) {
      return NextResponse.json(
        { error: error.message, code: 'WORKFLOW_TRANSITION_DENIED' },
        { status: error.statusCode }
      );
    }

    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DOUBLE_BOOKING_CONFLICT',
          conflictingBooking: error.conflictingBooking,
        },
        { status: 409 }
      );
    }

    if (error instanceof BookingRuleError) {
      return NextResponse.json(
        { error: error.message, code: 'BOOKING_RULE_ERROR' },
        { status: error.statusCode }
      );
    }

    console.error('[PATCH /api/bookings/[id]/approve] Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกผลการอนุมัติ' },
      { status: 500 }
    );
  }
}
