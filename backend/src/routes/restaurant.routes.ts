import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const restaurantController = new RestaurantController();

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management
 */

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Get all restaurants
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: List of restaurants
 */
router.get('/', restaurantController.getAll.bind(restaurantController));

/**
 * @swagger
 * /restaurants/my-screens:
 *   get:
 *     summary: Get screens assigned to the logged-in restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned screens
 *       401:
 *         description: Unauthorized
 */
router.get('/my-screens', authenticate, authorize([Role.RESTAURANT]), restaurantController.getMyScreens.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Get a restaurant by ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant details
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id', restaurantController.getOne.bind(restaurantController));

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nameAr
 *               - nameEn
 *               - email
 *               - password
 *             properties:
 *               nameAr:
 *                 type: string
 *               nameEn:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *               menuImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               contactPhone:
 *                 type: string
 *               sipExtension:
 *                 type: string
 *     responses:
 *       201:
 *         description: Restaurant created
 */
router.post('/', authenticate, authorize([Role.SUPER_ADMIN]), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'menuImages', maxCount: 10 }]), restaurantController.create.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
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
 *               nameEn:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *               menuImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               contactPhone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, BUSY, OFFLINE]
 *     responses:
 *       200:
 *         description: Restaurant updated
 *       404:
 *         description: Restaurant not found
 */
router.put('/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.RESTAURANT]), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'menuImages', maxCount: 10 }]), restaurantController.update.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
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
 *         description: Restaurant deleted
 *       404:
 *         description: Restaurant not found
 */
router.delete('/:id', authenticate, authorize([Role.SUPER_ADMIN]), restaurantController.delete.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}/activate:
 *   patch:
 *     summary: Activate restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant activated
 *       404:
 *         description: Restaurant not found
 */
router.patch('/:id/activate', authenticate, authorize([Role.SUPER_ADMIN]), restaurantController.activate.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}/deactivate:
 *   patch:
 *     summary: Deactivate restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant deactivated
 *       404:
 *         description: Restaurant not found
 */
router.patch('/:id/deactivate', authenticate, authorize([Role.SUPER_ADMIN]), restaurantController.deactivate.bind(restaurantController));

/**
 * @swagger
 * /restaurants/{id}/reset:
 *   post:
 *     summary: Force reset restaurant status (Clear locks)
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant status reset successfully
 *       404:
 *         description: Restaurant not found
 */
router.post('/:id/reset', authenticate, authorize([Role.SUPER_ADMIN, Role.RESTAURANT]), restaurantController.reset.bind(restaurantController));

export default router;
