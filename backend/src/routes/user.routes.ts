import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

router.get('/', authenticate, authorize([Role.SUPER_ADMIN]), userController.getAll.bind(userController));
router.post('/', authenticate, authorize([Role.SUPER_ADMIN]), userController.create.bind(userController));
router.delete('/:id', authenticate, authorize([Role.SUPER_ADMIN]), userController.delete.bind(userController));

export default router;
