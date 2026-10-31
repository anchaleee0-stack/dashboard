// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { startMeetingReminderScheduler } from './src/services/reminder.cron';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // สร้าง Socket.io Server และผูกไว้กับ globalThis.io เพื่อให้ API Routes เรียกใช้ได้
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  globalThis.io = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // ให้ไคลเอนต์เข้าร่วม Channel ส่วนตัวตาม userId เพื่อรับการแจ้งเตือนเฉพาะบุคคล
    socket.on('user:join', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    // เริ่มต้นระบบ Scheduled Trigger แจ้งเตือนล่วงหน้า 15 นาทีก่อนเริ่มประชุม
    startMeetingReminderScheduler();
  });
});
