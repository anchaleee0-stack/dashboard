// src/services/google-sync.service.ts
import { google } from 'googleapis';
import { GOOGLE_WORKSPACE_CONFIG } from '@/lib/google-config';

export { GOOGLE_WORKSPACE_CONFIG };

export interface BookingSheetRowPayload {
  id: string;
  title: string;
  roomName: string;
  floor: string;
  bookedBy: string;
  department: string;
  startTime: string | Date;
  endTime: string | Date;
  attendeeCount: number;
  status: string;
}

/**
 * สร้าง Google Auth Client จาก Service Account (สำหรับรันบน Production Server)
 */
function getGoogleAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

/**
 * บันทึกคิวการจองห้องประชุมใหม่ต่อท้ายลงใน Google Sheet (แท็บ Bookings) อัตโนมัติ
 */
export async function appendBookingToGoogleSheet(
  booking: BookingSheetRowPayload
): Promise<{ synced: boolean; spreadsheetUrl: string }> {
  const formatDateTime = (d: string | Date) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    return dateObj.toLocaleString('sv-SE', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const rowValues = [
    booking.id,
    booking.title,
    booking.roomName,
    booking.floor,
    booking.bookedBy,
    booking.department || 'General',
    formatDateTime(booking.startTime),
    formatDateTime(booking.endTime),
    String(booking.attendeeCount),
    booking.status,
    formatDateTime(new Date()),
  ];

  try {
    const auth = getGoogleAuthClient();
    if (!auth) {
      console.info(
        '[Google Sheets Sync] Prepared row for Spreadsheet ID:',
        GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_ID,
        rowValues
      );
      return {
        synced: false,
        spreadsheetUrl: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL,
      };
    }

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_ID,
      range: 'Bookings!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    return {
      synced: true,
      spreadsheetUrl: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL,
    };
  } catch (error) {
    console.error('[Google Sheets Sync] Failed to append booking row:', error);
    return {
      synced: false,
      spreadsheetUrl: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL,
    };
  }
}

/**
 * อัปเดตสถานะใน Google Sheet เมื่อมีการยกเลิกการจอง (เปลี่ยนเป็น CANCELLED)
 */
export async function updateBookingStatusInGoogleSheet(
  bookingId: string,
  newStatus: string
) {
  try {
    const auth = getGoogleAuthClient();
    if (!auth) return false;

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_ID,
      range: 'Bookings!A:J',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === bookingId);

    if (rowIndex === -1) return false;

    // คอลัมน์ J คือ Status (แถวใน Sheet เริ่มนับที่ 1)
    const targetCell = `Bookings!J${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_ID,
      range: targetCell,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newStatus]],
      },
    });

    return true;
  } catch (error) {
    console.error('[Google Sheets Sync] Failed to update status:', error);
    return false;
  }
}
