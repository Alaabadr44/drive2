import { Router } from 'express';
import restaurantRoutes from './restaurant.routes';
import screenRoutes from './screen.routes';
import callRoutes from './call.routes';
import menuRoutes from './menu.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/screens', screenRoutes);
router.use('/calls', callRoutes);
router.use('/menus', menuRoutes);




export default router;
