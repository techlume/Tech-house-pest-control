import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { login, logout, me, refresh } from '../controllers/authController.js';
import { env } from '../config/env.js';
import {
  requestEmailOtp,
  verifyEmailOtp,
} from '../controllers/emailVerificationController.js';
const router = Router();
router.get('/login', (_req, res) => res.redirect(env.CLIENT_URL + '/login'));
router.post(
  '/login',
  validate(
    z.object({
      body: z.object({ email: z.email(), password: z.string().min(8) }),
      params: z.object({}),
      query: z.object({}),
    }),
  ),
  asyncHandler(login),
);
const emailBody = z.object({ email: z.email() });
router.post(
  '/request-email-otp',
  validate(
    z.object({
      body: emailBody,
      params: z.object({}),
      query: z.object({}),
    }),
  ),
  asyncHandler(requestEmailOtp),
);
router.post(
  '/verify-email',
  validate(
    z.object({
      body: emailBody.extend({ otp: z.string().regex(/^[0-9]{6}$/) }),
      params: z.object({}),
      query: z.object({}),
    }),
  ),
  asyncHandler(verifyEmailOtp),
);
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(me));
export default router;
