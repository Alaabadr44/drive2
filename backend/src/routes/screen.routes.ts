import { Router } from 'express';
import { ScreenController } from '../controllers/screen.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';

const router = Router();
const screenController = new ScreenController();

/**
 * @swagger
 * tags:
 *   name: Screens
 *   description: Screen management API
 */

/**
 * @swagger
 * /screens:
 *   get:
 *     summary: Get all screens (paginated)
 *     tags: [Screens]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of screens
 */
router.get('/', screenController.getAll.bind(screenController));

/**
 * @swagger
 * /screens/my-restaurants:
 *   get:
 *     summary: Get restaurants assigned to the logged-in screen
 *     tags: [Screens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of restaurants
 *       401:
 *         description: Unauthorized
 */
router.get('/my-restaurants', authenticate, authorize([Role.SUPER_ADMIN, Role.SCREEN]), screenController.getMyRestaurants.bind(screenController));

/**
 * @swagger
 * /screens/{id}/unassign-restaurant:
 *   post:
 *     summary: Remove a restaurant from a screen
 *     tags: [Screens]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *             properties:
 *               restaurantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment removed
 */
router.post('/:id/unassign-restaurant', authenticate, authorize([Role.SUPER_ADMIN]), screenController.unassignRestaurant.bind(screenController));

/**
 * @swagger
 * /screens/{id}:
 *   get:
 *     summary: Get a screen by ID (includes config)
 *     tags: [Screens]
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
 *         description: Screen details
 *       404:
 *         description: Screen not found
 */
router.get('/:id', authenticate, screenController.getOne.bind(screenController));

/**
 * @swagger
 * /screens:
 *   post:
 *     summary: Create a new screen
 *     tags: [Screens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created screen
 */
router.post('/', authenticate, authorize([Role.SUPER_ADMIN]), screenController.create.bind(screenController));

/**
 * @swagger
 * /screens/{id}/assign-restaurant:
 *   post:
 *     summary: Assign a restaurant to a screen
 *     tags: [Screens]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId:
 *                 type: string
 *               isVisibleOnScreen:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Assignment updated
 */
router.post('/:id/assign-restaurant', authenticate, authorize([Role.SUPER_ADMIN]), screenController.assignRestaurant.bind(screenController));

/**
 * @swagger
 * /screens/{id}:
 *   put:
 *     summary: Update a screen (e.g., toggle active status)
 *     tags: [Screens]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Screen updated successfully
 */
router.put('/:id', authenticate, authorize([Role.SUPER_ADMIN]), screenController.update.bind(screenController));

/**
 * @swagger
 * /screens/{id}:
 *   delete:
 *     summary: Delete a screen
 *     tags: [Screens]
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
 *         description: Screen deleted
 */
router.delete('/:id', authenticate, authorize([Role.SUPER_ADMIN]), screenController.delete.bind(screenController));

export default router;
