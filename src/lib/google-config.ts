// src/lib/google-config.ts
// ไฟล์ตั้งค่าลิงก์ Google Sheets และ Google Drive ที่ใช้ได้ทั้งฝั่ง Client และ Server

export const GOOGLE_WORKSPACE_CONFIG = {
  SPREADSHEET_ID:
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID ||
    '1NYWRZI6rEMwEC2GxddW638t62I97Wa2ud5xkB-Hbhk0',
  DRIVE_FOLDER_ID:
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ||
    '1GbewQtDI6zhDU8eIvI8zEOEWCvQMJgyD',
  SPREADSHEET_URL:
    'https://docs.google.com/spreadsheets/d/1NYWRZI6rEMwEC2GxddW638t62I97Wa2ud5xkB-Hbhk0/edit',
  DRIVE_FOLDER_URL:
    'https://drive.google.com/drive/folders/1GbewQtDI6zhDU8eIvI8zEOEWCvQMJgyD',
};
