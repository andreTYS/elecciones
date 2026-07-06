import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './services/socket.service';
import { logger } from './utils/logger';

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  logger.info(`🗳️  VotoControl API escuchando en puerto ${env.PORT} (${env.NODE_ENV})`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => process.exit(0));
});
