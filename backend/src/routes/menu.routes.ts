import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const menuController = new MenuController();

/**
 * @swagger
 * tags:
 *   name: Menus
 *   description: Menu management
 */

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: Get all menus
 *     tags: [Menus]
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filter by restaurant ID
 *     responses:
 *       200:
 *         description: List of menus
 */
router.get('/', menuController.getAll.bind(menuController));

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     summary: Get a menu by ID
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu details
 *       404:
 *         description: Menu not found
 */
router.get('/:id', menuController.getOne.bind(menuController));

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: Create a new menu
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - image
 *             properties:
 *               restaurantId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Menu created
 *       403:
 *         description: Forbidden - Only Super Admin can create
 */
router.post('/', authenticate, authorize([Role.SUPER_ADMIN]), upload.single('image'), menuController.create.bind(menuController));

/**
 * @swagger
 * /menus/{id}:
 *   put:
 *     summary: Update a menu
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Menu updated
 *       403:
 *         description: Forbidden - Only Super Admin can update
 */
router.put('/:id', authenticate, authorize([Role.SUPER_ADMIN]), upload.single('image'), menuController.update.bind(menuController));


/**
 * @swagger
 * /menus/{id}:
 *   delete:
 *     summary: Delete a menu
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Menu deleted
 *       403:
 *         description: Forbidden - Only Super Admin can delete
 */
router.delete('/:id', authenticate, authorize([Role.SUPER_ADMIN]), menuController.delete.bind(menuController));

export default router;
