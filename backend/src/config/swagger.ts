import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Touch Based Ordering Kiosk System API',
      version: '1.0.0',
      description: 'API documentation for the Kiosk Backend System',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'RESTAURANT', 'USER'] },
            restaurantId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        Restaurant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            email: { type: 'string', description: 'Optional: Create user for restaurant' },
            password: { type: 'string', description: 'Optional: Create user for restaurant' },
            status: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'OFFLINE'] },
            logoUrl: { type: 'string' },
            contactPhone: { type: 'string' },
            sipExtension: { type: 'string' },
            isVisible: { type: 'boolean' },
          },
        },
        CallSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            kioskId: { type: 'string' },
            restaurantId: { type: 'string' },
            status: { type: 'string', enum: ['INITIATED', 'RINGING', 'ACTIVE', 'ENDED', 'MISSED', 'REJECTED'] },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/entities/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
