import { Request, Response } from 'express';
import { CallService } from '../services/call.service';
import { CallStatus } from '../entities/CallSession';

const callService = new CallService();

import { sendResponse, sendError } from '../utils/response';
import { getLocalIpAddress } from '../utils/network';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  async getCallStats(req: any, res: any) {
      try {
          const stats = await callService.getStats();
          sendResponse(res, stats, 'Call statistics retrieved successfully');
      } catch (error) {
          console.error('[CallController] Error fetching stats:', error);
          sendError(res, 'Failed to fetch call statistics');
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

      const call = await callService.saveRecording(id, recordingUrl, file.size);
      sendResponse(res, call, 'Recording uploaded successfully');
    } catch (error) {
      console.error('Error uploading recording:', error);
      sendError(res, 'Failed to upload recording');
    }
  }

  async downloadRecording(req: any, res: any) {
    try {
        const { id } = req.params;
        // In a real app, we should fetch the call to get the filename from DB URL
        // For simplicity, assuming caller might not know filename but we can find it via stats or query.
        // Actually, let's just use the filename if passed query param OR fetch from DB.
        // Since the route is /:id/download, we should fetch the call.
        
        // However, `callService.findOne` is private. Let's make a public getter or just use existing logic?
        // Wait, `saveRecording` fetches it.
        // I'll add a quick find method to service or just query repo here? 
        // Controller shouldn't query repo directly if possible. 
        // Let's assume the user calls this endpoint.
        
        // I need to fetch the call to get the file path.
        // Since I can't easily add a new service method in this multi-edit cleanly without risk, 
        // I'll try to use the raw repo pattern or modify service later?
        // No, I can create a new service method `getCallById` quickly or rely on repo if exposed.
        // `callService` has `callRepository` but it is private.
        // Wait, `updateStatus` returns the call. 
        // `endCall` returns the call.
        
        // I'll use a `getRecordingPath` helper I'm about to add to the Service? 
        // Or just let the Service handle the logic? NO, controller handles logic like streams usually.
        
        // Let's Assume I can fetch it. I'll modify the Controller to access a new service method `getCall(id)`.
        // I will add `getCall(id)` to Service in next step if needed, or just assume I can find it.
        // Actually, I can just cheat and use `saveRecording` logic... no.
        
        // I will implement it assuming `callService.getCall(id)` exists, and I will add it to service in next turn to be safe?
        // No, I should add it now. But I am editing Controller.
        
        // Let's look at `findAll`. It returns items.
        // I'll just use `callService.updateStatus(id, ...)`? No that changes state.
        
        // Fix: I will access the DB directly? No, messy imports.
        // I will add `getCall(id)` in the service modification step? Too late, I did that.
        // Okay, I will add `getCall` to Service via `replace_file` AFTER this tool call.
        // For now, I will write the code assuming it exists. `await callService.getCallById(id)`.
        
        const call = await callService.getCallById(id);
        if (!call || !call.recordingUrl) {
            return sendError(res, 'Recording not found', 404);
        }

        // Extract filename from URL
        const filename = call.recordingUrl.split('/').pop();
        if (!filename) return sendError(res, 'Invalid recording path', 500);

        const uploadsDir = path.join(process.cwd(), 'public/uploads/recordings');
        const sourcePath = path.join(uploadsDir, filename);
        const mp3Filename = filename.replace(/\.(webm|mp4|ogg|wav)$/, '.mp3');
        const mp3Path = path.join(uploadsDir, mp3Filename);

        if (!fs.existsSync(sourcePath)) {
            return sendError(res, 'Source file missing', 404);
        }

        // Check if MP3 already exists
        if (fs.existsSync(mp3Path)) {
            return res.download(mp3Path, mp3Filename);
        }

        // Convert if not exists
        console.log(`[CallController] Converting ${filename} to MP3...`);
        try {
            await execAsync(`ffmpeg -i "${sourcePath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`);
            console.log(`[CallController] Conversion complete: ${mp3Filename}`);
            return res.download(mp3Path, mp3Filename);
        } catch (convError) {
            console.error('[CallController] FFmpeg conversion failed:', convError);
            return sendError(res, 'Conversion failed', 500);
        }

    } catch (error) {
        console.error('Error downloading recording:', error);
        sendError(res, 'Failed to download recording');
    }
  }
}
