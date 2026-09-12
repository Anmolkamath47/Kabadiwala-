import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import internalDealerRoutes from './routes/internalDealerRoutes.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Security headers
app.use(helmet());

// CORS config
app.use(
  cors({
    origin: '*', // Allow consumer web app & dealer app origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-dealer-api-key', 'x-internal-key'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Kabadiwala Consumer Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/internal/dealer-events', internalDealerRoutes);
app.use('/api/internal/dealer', internalDealerRoutes);

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
