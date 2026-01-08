import { Response } from 'express';

export const sendResponse = (
  res: any,
  data: any,
  message: string = 'success',
  statusCode: number = 200,
  meta?: any
) => {
  res.status(statusCode).json({
    code: statusCode,
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
};

export const sendError = (
  res: any,
  message: string = 'Internal server error',
  statusCode: number = 500,
  data: any = {}
) => {
  res.status(statusCode).json({
    code: statusCode,
    success: false,
    message,
    data,
  });
};

export const sendValidationError = (
  res: any,
  errors: any[],
  message: string = 'Validation failed'
) => {
  res.status(400).json({
    code: 400,
    success: false,
    message,
    data: {
      errors,
    },
  });
};


