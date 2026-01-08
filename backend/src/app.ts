import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

import path from 'path';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import { sendResponse } from './utils/response';

// Health Check
app.get('/health', (req: any, res: any) => {
  sendResponse(res, { timestamp: new Date().toISOString() }, 'ok');
});

import routes from './routes';

app.use('/api', routes); // Prefixed with /api

export default app;
