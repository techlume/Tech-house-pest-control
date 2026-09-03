import { Router } from 'express';
import {
  getSiteConfig,
  updateSiteConfig,
  createStorefrontBooking,
  getStorefrontBookings,
} from '../controllers/siteConfigController.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public routes for D2C Storefront
router.get('/', getSiteConfig);
router.get('/bookings', getStorefrontBookings);
router.post('/bookings', createStorefrontBooking);

// Protected routes for Admin Site Changes
router.put('/', authenticate, allowRoles(ROLES.OWNER, ROLES.ADMIN), updateSiteConfig);

export default router;
