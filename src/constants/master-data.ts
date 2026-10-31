// src/constants/master-data.ts
import {
  AmenityOption,
  NamePrefixType,
  RoleUserProfile,
  RoomOption,
} from '@/types/booking';

export const PREFIX_MAP: Record<NamePrefixType, 'นาย' | 'นาง' | 'นางสาว'> = {
  MR: 'นาย',
  MRS: 'นาง',
  MS: 'นางสาว',
};

export const PREFIX_REVERSE_MAP: Record<string, NamePrefixType> = {
  นาย: 'MR',
  นาง: 'MRS',
  นางสาว: 'MS',
  MR: 'MR',
  MRS: 'MRS',
  MS: 'MS',
};

// รายชื่อห้องประชุมตามแบบฟอร์มราชการ วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์ (6 ห้องหลัก + 1 อื่น ๆ)
export const OFFICIAL_ROOMS: RoomOption[] = [
  {
    id: 'room-adireksarn',
    code: 'ADIREKSARN',
    name: 'หอประชุมอดิเรกสาร',
    capacity: 300,
    floor: 'อาคารหอประชุม',
    building: 'อาคารหอประชุมอดิเรกสาร',
    amenities: [
      'เครื่องฉายภาพ (Projector)',
      'ระบบเสียง',
      'ไมโครโฟน',
      'เครื่องปรับอากาศ',
      'อินเทอร์เน็ต',
    ],
    colorCode: '#06B6D4',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-sakthong',
    code: 'SAKTHONG',
    name: 'ห้องประชุมสักทอง',
    capacity: 80,
    floor: 'อาคารอำนวยการ ชั้น 1',
    building: 'อาคารอำนวยการ',
    amenities: [
      'เครื่องฉายภาพ (Projector)',
      'ระบบเสียง',
      'ไมโครโฟน',
      'เครื่องปรับอากาศ',
      'อินเทอร์เน็ต',
    ],
    colorCode: '#8B5CF6',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-director',
    code: 'DIRECTOR_FRONT',
    name: 'ห้องประชุมหน้าห้องผู้อำนวยการ',
    capacity: 25,
    floor: 'อาคารอำนวยการ ชั้น 2',
    building: 'อาคารอำนวยการ',
    amenities: [
      'เครื่องฉายภาพ (Projector)',
      'ไมโครโฟน',
      'เครื่องปรับอากาศ',
      'อินเทอร์เน็ต',
    ],
    colorCode: '#10B981',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-coffee',
    code: 'COFFEE_ROOM',
    name: 'ห้องประชุม (กาแฟ)',
    capacity: 30,
    floor: 'โซนคาเฟ่วิทยาลัยฯ',
    building: 'อาคารศูนย์บริการ',
    amenities: [
      'เครื่องฉายภาพ (Projector)',
      'ระบบเสียง',
      'เครื่องปรับอากาศ',
      'อินเทอร์เน็ต',
    ],
    colorCode: '#F59E0B',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-dome',
    code: 'MULTIPURPOSE_DOME',
    name: 'อาคารโดมเอนกประสงค์',
    capacity: 500,
    floor: 'ลานโดมเอนกประสงค์',
    building: 'โดมเอนกประสงค์',
    amenities: ['ระบบเสียง', 'ไมโครโฟน', 'โต๊ะ/เก้าอี้เพิ่มเติม'],
    colorCode: '#3B82F6',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-computer-av',
    code: 'COMPUTER_AV',
    name: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)',
    capacity: 50,
    floor: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    building: 'อาคารศูนย์ดิจิทัลฯ',
    amenities: [
      'เครื่องฉายภาพ (Projector)',
      'ระบบเสียง',
      'ไมโครโฟน',
      'เครื่องปรับอากาศ',
      'อินเทอร์เน็ต',
    ],
    colorCode: '#EC4899',
    isCustomRoom: false,
    isActive: true,
  },
  {
    id: 'room-other',
    code: 'OTHER',
    name: 'อื่น ๆ (ระบุสถานที่เพิ่มเติม)',
    capacity: 1000,
    floor: 'ระบุสถานที่เอง',
    building: 'ภายในวิทยาลัยฯ',
    amenities: ['ระบบเสียง', 'ไมโครโฟน', 'โต๊ะ/เก้าอี้เพิ่มเติม'],
    colorCode: '#64748B',
    isCustomRoom: true,
    isActive: true,
  },
];

// ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวกตามแบบฟอร์ม PDF
export const OFFICIAL_AMENITIES: AmenityOption[] = [
  { id: 'am-projector', code: 'PROJECTOR', name: 'เครื่องฉายภาพ (Projector)' },
  { id: 'am-sound', code: 'SOUND', name: 'ระบบเสียง' },
  { id: 'am-mic', code: 'MIC', name: 'ไมโครโฟน' },
  { id: 'am-aircon', code: 'AIRCON', name: 'เครื่องปรับอากาศ' },
  { id: 'am-internet', code: 'INTERNET', name: 'อินเทอร์เน็ต' },
  {
    id: 'am-chairs',
    code: 'EXTRA_CHAIRS',
    name: 'โต๊ะ/เก้าอี้เพิ่มเติม',
    requiresQuantity: true,
  },
  {
    id: 'am-other',
    code: 'OTHER',
    name: 'อื่น ๆ',
    requiresCustomText: true,
  },
];

export const OFFICIAL_TERMS_TEXT =
  'ข้าพเจ้าขอรับรองว่าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยโดยเคร่งครัด';

// บัญชีผู้ใช้งานทั้ง 4 บทบาท (Roles) ตามสายบังคับบัญชาจริงของวิทยาลัยฯ สำหรับทดสอบและใช้งาน
export const ROLE_DEMO_USERS: RoleUserProfile[] = [
  {
    id: 'usr-requester-01',
    email: 'kanokwan@technic.ac.th',
    prefix: 'MS',
    prefixLabel: 'นางสาว',
    name: 'กนกวรรณ ศรีสวัสดิ์',
    fullName: 'นางสาวกนกวรรณ ศรีสวัสดิ์',
    position: 'ครูชำนาญการ',
    department: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
    phone: '081-456-7890',
    role: 'REQUESTER',
    roleBadgeLabel: 'Role 1: ผู้ยื่นคำขอ (ครู/บุคลากร)',
  },
  {
    id: 'usr-inspector-01',
    email: 'watcharapong@technic.ac.th',
    prefix: 'MR',
    prefixLabel: 'นาย',
    name: 'วัชรพงศ์ โสภา',
    fullName: 'นายวัชรพงศ์ โสภา',
    position: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    phone: '089-876-5432',
    role: 'ROOM_INSPECTOR',
    roleBadgeLabel: 'Role 2: เจ้าหน้าที่ผู้ตรวจสอบห้อง',
  },
  {
    id: 'usr-head-01',
    email: 'ekarach@technic.ac.th',
    prefix: 'MR',
    prefixLabel: 'นาย',
    name: 'เอกราช เขียวทอง',
    fullName: 'นายเอกราช เขียวทอง',
    position: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
    department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    phone: '081-234-5678',
    role: 'DEPARTMENT_HEAD',
    roleBadgeLabel: 'Role 3: หัวหน้างาน/ผู้รับรอง',
  },
  {
    id: 'usr-exec-01',
    email: 'chatree@technic.ac.th',
    prefix: 'MR',
    prefixLabel: 'นาย',
    name: 'ชาตรี เริงชัยภูมิ',
    fullName: 'นายชาตรี เริงชัยภูมิ',
    position: 'รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
    department: 'ฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
    phone: '081-999-8888',
    role: 'EXECUTIVE_APPROVER',
    roleBadgeLabel: 'Role 4: รองผู้อำนวยการ (ผู้พิจารณาอนุมัติ)',
  },
];

// ==========================================
// Helper แปลงวันที่เป็นรูปแบบ พุทธศักราช (พ.ศ.)
// ==========================================
const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatThaiDateBE(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${yearBE}`;
}

export function formatThaiShortDateBE(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

export function formatDateInputToBEPreview(yyyyMmDd: string): string {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return yyyyMmDd;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || monthIdx < 0 || monthIdx > 11 || isNaN(day)) return yyyyMmDd;
  return `${day} ${THAI_MONTHS_FULL[monthIdx]} พ.ศ. ${year + 543}`;
}
