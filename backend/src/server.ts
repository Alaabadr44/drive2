import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

import { registerCallHandlers } from './sockets/call.handler';
import { registerAdminHandlers } from './sockets/admin.handler';

io.on('connection', (socket) => {
  console.log('[SOCKET] 🟢 Client connected:', socket.id);


  
  socket.on('disconnect', () => {
    console.log('[SOCKET] 🔴 Client disconnected:', socket.id);
  });

  // Register Handlers
  registerCallHandlers(socket);
  registerAdminHandlers(socket);
});

import { AppDataSource } from './config/data-source';

const MAX_RETRIES = 10;
const RETRY_DELAY = 3000;

async function initializeDatabase(retries = MAX_RETRIES) {
  try {
    await AppDataSource.initialize();
    console.log('✅ Data source initialized');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`⚠️ Database connection failed. Retrying in ${RETRY_DELAY / 1000}s... (${retries} attempts left)`);
      setTimeout(() => initializeDatabase(retries - 1), RETRY_DELAY);
    } else {
      console.error('❌ Could not connect to database after multiple attempts:', err);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

export { io };
