import { Request, Response } from 'express';
import { MenuService } from '../services/menu.service';
import { sendResponse, sendError } from '../utils/response';

const menuService = new MenuService();

export class MenuController {
  async getAll(req: any, res: any) {
    try {
      const { restaurantId } = req.query;
      const menus = await menuService.findAll(restaurantId as string);
      sendResponse(res, menus);
    } catch (error) {
      console.error('Error getting menus:', error);
      sendError(res, 'Failed to fetch menus');
    }
  }

  async getOne(req: any, res: any) {
    try {
      const { id } = req.params;
      const menu = await menuService.findById(id);
      if (!menu) {
        return sendError(res, 'Menu not found', 404);
      }
      sendResponse(res, menu);
    } catch (error) {
      console.error('Error getting menu:', error);
      sendError(res, 'Failed to fetch menu');
    }
  }

  async create(req: any, res: any) {
    try {
      const data = req.body;
      
      if (!req.file) {
        return sendError(res, 'Menu image is required', 400);
      }

      // imageUrl will be the path to the uploaded file
      // Example: uploads/menus/image-123456789.jpg
      data.imageUrl = req.file.path.replace(/\\/g, '/');

      const menu = await menuService.create(data);
      sendResponse(res, menu, 'Menu created successfully', 201);
    } catch (error) {
      console.error('Error creating menu:', error);
      sendError(res, 'Failed to create menu');
    }
  }

  async update(req: any, res: any) {
    try {
      const { id } = req.params;
      const data = req.body;

      if (req.file) {
        data.imageUrl = req.file.path.replace(/\\/g, '/');
      }

      const menu = await menuService.update(id, data);
      if (!menu) {
        return sendError(res, 'Menu not found', 404);
      }
      sendResponse(res, menu, 'Menu updated successfully');
    } catch (error) {
      console.error('Error updating menu:', error);
      sendError(res, 'Failed to update menu');
    }
  }

  async delete(req: any, res: any) {
    try {
      // Access Control is handled by route middleware (authorize([Role.SUPER_ADMIN]))
      const { id } = req.params;
      await menuService.delete(id);
      sendResponse(res, null, 'Menu deleted successfully', 204);
    } catch (error) {
      console.error('Error deleting menu:', error);
      sendError(res, 'Failed to delete menu');
    }
  }
}
