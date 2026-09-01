import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl?.startsWith('/api/v1/payments/webhook')) {
        req.rawBody = buffer.toString('utf8');
      }
    },
  }),
);
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/v1/auth/login', rateLimit({ windowMs: 900000, limit: 10 }));
app.use(
  '/api/v1/auth/request-email-otp',
  rateLimit({ windowMs: 900000, limit: 5 }),
);
app.use(
  '/api/v1/auth/verify-email',
  rateLimit({ windowMs: 900000, limit: 10 }),
);
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);
