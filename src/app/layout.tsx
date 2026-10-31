import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบจองห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
  description:
    'ระบบดิจิทัลขออนุญาตใช้ห้องประชุม ตรวจสอบความพร้อมห้อง รับรอง และอนุมัติตามสายบังคับบัญชา พร้อมพิมพ์เอกสารราชการ A4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
