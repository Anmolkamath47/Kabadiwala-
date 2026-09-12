import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { initSocketServer } from './sockets/socketManager.js';

const startServer = async () => {
  try {
    // 1. Connect database
    await connectDB();

    // 2. Create HTTP & Socket.IO server
    const httpServer = createServer(app);
    initSocketServer(httpServer);

    // 3. Start listening
    httpServer.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ♻️  KABADIWALA - CONSUMER SCRAP PICKUP BACKEND API SERVER       ║
║                                                                   ║
║   🚀 Port:              ${config.port}                                      ║
║   🌐 API Base:          http://localhost:${config.port}/api                 ║
║   🔌 Socket.IO:         http://localhost:${config.port}                     ║
║   🌿 Environment:       ${config.nodeEnv}                               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
