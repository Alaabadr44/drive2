import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';

const router = Router();
const dashboardController = new DashboardController();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Super Admin Dashboard stats
 */

router.get('/stats', authenticate, authorize([Role.SUPER_ADMIN]), dashboardController.getStats.bind(dashboardController));

export default router;
