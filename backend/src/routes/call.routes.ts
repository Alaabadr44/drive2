import { Router } from 'express';
import { CallController } from '../controllers/call.controller';

const router = Router();
const controller = new CallController();

/**
 * @swagger
 * tags:
 *   name: Calls
 *   description: Call session management API
 */

/**
 * @swagger
 * /calls/initiate:
 *   post:
 *     summary: Initiate a new call session from a kiosk
 *     tags: [Calls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kioskId
 *               - restaurantId
 *             properties:
 *               kioskId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Call initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CallSession'
 *       409:
 *         description: Kiosk is already in a call or Restaurant is busy
 */
router.post('/initiate', controller.initiate.bind(controller));

/**
 * @swagger
 * /calls/end:
 *   post:
 *     summary: End an active call session
 *     tags: [Calls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callId
 *             properties:
 *               callId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call ended successfully
 */
router.post('/end', controller.end.bind(controller));

/**
 * @swagger
 * /calls:
 *   get:
 *     summary: Get all call sessions (Super Admin only)
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of call sessions
 */
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '../entities/User';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage for recordings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/recordings';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rec-' + uniqueSuffix + path.extname(file.originalname) || '.webm');
  }
});
const upload = multer({ storage: storage });

router.get('/', authenticate, authorize([Role.SUPER_ADMIN]), controller.getAll.bind(controller));

/**
 * @swagger
 * /calls/{id}/recording:
 *   post:
 *     summary: Upload voice recording for a call
 *     tags: [Calls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Call Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               recording:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Recording uploaded successfully
 */
router.post('/:id/recording', upload.single('recording'), controller.uploadRecording.bind(controller));

// Admin Stats
router.get('/stats', authenticate, authorize([Role.SUPER_ADMIN]), controller.getCallStats.bind(controller));

// Download Recording (MP3 Conversion)
router.get('/:id/download', controller.downloadRecording.bind(controller));


export default router;
