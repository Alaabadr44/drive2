import { Request, Response } from 'express';
import { CallService } from '../services/call.service';
import { CallStatus } from '../entities/CallSession';

const callService = new CallService();

import { sendResponse, sendError } from '../utils/response';
import { getLocalIpAddress } from '../utils/network';

export class CallController {
  
  async initiate(req: any, res: any) {
      try {
          const { kioskId, restaurantId } = req.body;
          // Validate input
          if (!kioskId || !restaurantId) return sendError(res, 'Missing kioskId or restaurantId', 400);

          const call = await callService.initiateCall(kioskId, restaurantId);
          sendResponse(res, call, 'Call initiated successfully', 201);
      } catch (error: any) {
          console.error(error);
          if (error.message === 'Kiosk is already in a call' || error.message === 'Restaurant is busy or offline') {
              sendError(res, error.message, 409);
          } else {
              sendError(res, 'Failed to initiate call');
          }
      }
  }

  async end(req: any, res: any) {
      try {
          const { callId, orderNumber } = req.body;
           if (!callId) return sendError(res, 'Missing callId', 400);

          const call = await callService.endCall(callId, orderNumber);
          sendResponse(res, call, 'Call ended successfully');
      } catch (error) {
          console.error(error);
          sendError(res, 'Failed to end call');
      }
  }

  async getAll(req: any, res: any) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters = {
        screenId: req.query.screenId as string,
        restaurantId: req.query.restaurantId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await callService.findAll(page, limit, filters);
      sendResponse(res, result, 'Calls retrieved successfully');
    } catch (error) {
      console.error('Error fetching calls:', error);
      sendError(res, 'Failed to fetch calls');
    }
  }

  async uploadRecording(req: any, res: any) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return sendError(res, 'No recording file uploaded', 400);
      }

      // Use local IP for accessibility
      const port = process.env.PORT || 3000;
      const baseUrl = process.env.APP_URL || `http://${getLocalIpAddress()}:${port}`;
      
      const recordingUrl = `${baseUrl}/uploads/recordings/${file.filename}`;

      const call = await callService.saveRecording(id, recordingUrl);
      sendResponse(res, call, 'Recording uploaded successfully');
    } catch (error) {
      console.error('Error uploading recording:', error);
      sendError(res, 'Failed to upload recording');
    }
  }
}
