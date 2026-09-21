import 'dotenv/config';
import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import routes from './routes.js';

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const corsOptions = { origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin is not allowed by CORS')); } };
const io = new SocketServer(httpServer, { cors: corsOptions });
const port = process.env.PORT || 5000;

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/messages', rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', routes);

io.on('connection', (socket) => {
  socket.on('join-room', (email) => { if (email) socket.join(email.toLowerCase()); });
  socket.on('send-message', (message) => {
    if (message?.recipientEmail) io.to(message.recipientEmail.toLowerCase()).emit('chat-message', message);
  });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection failed:', error.message));
}

httpServer.listen(port, () => console.log(`SkillSwap API running on http://localhost:${port}`));
