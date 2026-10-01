import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { login, logout, me, refresh } from '../controllers/authController.js';
import { env } from '../config/env.js';
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
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(me));
export default router;
