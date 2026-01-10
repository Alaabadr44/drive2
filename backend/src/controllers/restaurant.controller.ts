import { Request, Response } from 'express';
import { RestaurantService } from '../services/restaurant.service';
import { AiService } from '../services/ai.service';

const restaurantService = new RestaurantService();
const aiService = new AiService();
import { sendResponse, sendError } from '../utils/response';

import { getLocalIpAddress } from '../utils/network';

export class RestaurantController {
  private transformRestaurant(restaurant: any) {
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.APP_URL || `http://${getLocalIpAddress()}:${port}`;
    
    if (restaurant.logoUrl && !restaurant.logoUrl.startsWith('http')) {
      // Remove leading slash from stored path if present
      const cleanPath = restaurant.logoUrl.startsWith('/') ? restaurant.logoUrl.substring(1) : restaurant.logoUrl;
      restaurant.logoUrl = `${baseUrl}/${cleanPath}`;
    }

    // Enrich with user info if available
    if (restaurant.users && restaurant.users.length > 0) {
        const user = restaurant.users[0]; // Assuming one user per restaurant
        restaurant.email = user.email;
        restaurant.password = user.passwordHash; // Return real password hash as requested
    }

    // Ensure isActive is present
    if (restaurant.isActive === undefined) {
        restaurant.isActive = true;
    }

    // Transform Menu Image URLs (menus relation)
    if (restaurant.menus && Array.isArray(restaurant.menus)) {
      restaurant.menus = restaurant.menus.map((menu: any) => {
        if (menu.imageUrl && !menu.imageUrl.startsWith('http')) {
          const cleanPath = menu.imageUrl.startsWith('/') ? menu.imageUrl.substring(1) : menu.imageUrl;
          menu.imageUrl = `${baseUrl}/${cleanPath}`;
        }
        return menu;
      });
    }

    delete restaurant.users; // Clean up internal relation
    return restaurant;
  }

  async getAll(req: any, res: any) {
    try {
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const restaurants = await restaurantService.findAll(isActive);
      const transformedRestaurants = restaurants.map(r => this.transformRestaurant(r));
      sendResponse(res, transformedRestaurants);
    } catch (error) {
      console.error('Error getting all restaurants:', error);
      sendError(res, 'Failed to fetch restaurants');
    }
  }

  async getOne(req: any, res: any) {
    try {
      const { id } = req.params;
      const restaurant = await restaurantService.findById(id);
      if (!restaurant) {
        return sendError(res, 'Restaurant not found', 404);
      }
      sendResponse(res, this.transformRestaurant(restaurant));
    } catch (error) {
      console.error('Error getting restaurant:', error);
      sendError(res, 'Failed to fetch restaurant');
    }
  }

  async create(req: any, res: any) {
    try {
      const data = req.body;
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        if (files['logo'] && files['logo'][0]) {
            data.logoUrl = files['logo'][0].path.replace(/\\/g, '/');
        }
        
        if (files['menuImages']) {
          data.menuImageUrls = files['menuImages'].map(file => file.path.replace(/\\/g, '/'));
        }
      }

      if (data.status) {
          data.status = data.status.toUpperCase();
      }

      const restaurant = await restaurantService.create(data);
      sendResponse(res, this.transformRestaurant(restaurant), 'Restaurant created successfully', 201);
    } catch (error) {
      console.error('Error creating restaurant:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      sendError(res, 'Failed to update restaurant: ' + message, 500);
    }
  }

  async reset(req: any, res: any) {
    try {
      const { id } = req.params;

      // Ownership Check: If user is RESTAURANT, they can only reset themselves
      if (req.user && req.user.role === 'RESTAURANT' && req.user.restaurantId !== id) {
           return sendError(res, 'You can only reset your own status', 403);
      }

      const restaurant = await restaurantService.resetStatus(id);
      if (!restaurant) {
          return sendError(res, 'Restaurant not found', 404);
      }
      sendResponse(res, this.transformRestaurant(restaurant), 'Restaurant status reset successfully');
    } catch (error) {
      console.error('Error resetting restaurant status:', error);
      sendError(res, 'Failed to reset restaurant status');
    }
  }

  async update(req: any, res: any) {
    try {
      const { id } = req.params;
      
      // Security check: RESTAURANT role can only update their own restaurant
      if (req.user.role === 'RESTAURANT' && req.user.restaurantId !== id) {
          return sendError(res, 'Forbidden: You can only update your own restaurant', 403);
      }

      const rawData = req.body;
      const data: any = {};

      // Explicitly copy allowed fields
      if (rawData.nameAr !== undefined) data.nameAr = rawData.nameAr;
      if (rawData.nameEn !== undefined) data.nameEn = rawData.nameEn;
      if (rawData.contactPhone !== undefined) data.contactPhone = rawData.contactPhone;
      if (rawData.sipExtension !== undefined) data.sipExtension = rawData.sipExtension;
      if (rawData.email !== undefined) data.email = rawData.email;
      if (rawData.password !== undefined) data.password = rawData.password;
      
      // Handle booleans (FormData sends strings)
      if (rawData.isVisible !== undefined) {
          data.isVisible = String(rawData.isVisible) === 'true';
      }
      
      if (rawData.status) {
          data.status = rawData.status.toUpperCase();
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
         if (files['logo'] && files['logo'][0]) {
             data.logoUrl = files['logo'][0].path.replace(/\\/g, '/');
         }
         
         if (files['menuImages']) {
           data.menuImageUrls = files['menuImages'].map(file => file.path.replace(/\\/g, '/'));
         }
      }

      const restaurant = await restaurantService.update(id, data);
      if (!restaurant) {
        return sendError(res, 'Restaurant not found', 404);
      }
      sendResponse(res, this.transformRestaurant(restaurant));
    } catch (error) {
      console.error('Error updating restaurant:', error);
      sendError(res, 'Failed to update restaurant');
    }
  }

  async delete(req: any, res: any) {
    try {
      const { id } = req.params;
      await restaurantService.delete(id);
      sendResponse(res, null, 'Restaurant deleted successfully', 204);
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendError(res, 'Failed to delete restaurant: ' + errorMessage, 500, { error });
    }
  }

  async activate(req: any, res: any) {
    try {
      const { id } = req.params;
      const restaurant = await restaurantService.findById(id);
      
      if (!restaurant) {
        return sendError(res, 'Restaurant not found', 404);
      }

      await restaurantService.update(id, { isActive: true });
      restaurant.isActive = true;
      
      sendResponse(res, this.transformRestaurant(restaurant), 'Restaurant activated successfully');
    } catch (error) {
      console.error('Error activating restaurant:', error);
      sendError(res, 'Failed to activate restaurant');
    }
  }

  async deactivate(req: any, res: any) {
    try {
      const { id } = req.params;
      const restaurant = await restaurantService.findById(id);
      
      if (!restaurant) {
        return sendError(res, 'Restaurant not found', 404);
      }

      await restaurantService.update(id, { isActive: false });
      restaurant.isActive = false;
      
      sendResponse(res, this.transformRestaurant(restaurant), 'Restaurant deactivated successfully');
    } catch (error) {
      console.error('Error deactivating restaurant:', error);
      sendError(res, 'Failed to deactivate restaurant');
    }
  }

  async getMyScreens(req: any, res: any) {
    try {
      const restaurantId = req.user?.restaurantId;
      
      if (!restaurantId) {
        return sendError(res, 'No restaurant associated with this user', 400);
      }

      const restaurant = await restaurantService.findById(restaurantId);
      if (!restaurant) {
        return sendError(res, 'Restaurant not found', 404);
      }

      // Get screens from screenConfigs relation
      const screens = restaurant.screenConfigs
        ?.filter((config: any) => config.screen?.isActive && config.isVisibleOnScreen)
        .map((config: any) => ({
          id: config.screen?.id,
          name: config.screen?.name,
          isActive: config.screen?.isActive,
          isVisibleOnScreen: config.isVisibleOnScreen
        })) || [];

      sendResponse(res, screens, 'Screens fetched successfully');
    } catch (error) {
      console.error('Error fetching my screens:', error);
      sendError(res, 'Failed to fetch restaurant');
    }
  }

  async analyzeMenu(req: any, res: any) {
    try {
        const { id } = req.params;
        
        // Check permissions (Super Admin or Owner)
        if (req.user.role === 'RESTAURANT' && req.user.restaurantId !== id) {
            return sendError(res, 'Forbidden', 403);
        }

        const rawResult = await aiService.analyzeMenu(id);
        
        // We return the raw text result, but it is also saved in DB
        sendResponse(res, { analysis: rawResult }, 'Menu analysis completed successfully');
    } catch (error) {
        console.error('Error analyzing menu:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        sendError(res, `Failed to analyze menu: ${msg}`, 500);
    }
  }
}
