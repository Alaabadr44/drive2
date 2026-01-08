import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendResponse, sendError } from '../utils/response';

const dashboardService = new DashboardService();

export class DashboardController {
  async getStats(req: any, res: any) {
    try {
      const stats = await dashboardService.getStats();
      sendResponse(res, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      sendError(res, 'Failed to fetch dashboard stats');
    }
  }
}
