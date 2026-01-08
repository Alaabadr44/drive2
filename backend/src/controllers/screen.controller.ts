import { Request, Response } from 'express';
import { ScreenService } from '../services/screen.service';

const screenService = new ScreenService();

import { sendResponse, sendError } from '../utils/response';
import { getLocalIpAddress } from '../utils/network';

export class ScreenController {
  private transformScreen(screen: any) {
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.APP_URL || `http://${getLocalIpAddress()}:${port}`;

    if (screen.restaurantConfigs) {
      screen.restaurants = screen.restaurantConfigs.map((config: any) => {
        const restaurant = { ...config.restaurant };
        
        // Transform URLs
        if (restaurant.logoUrl && !restaurant.logoUrl.startsWith('http')) {
          restaurant.logoUrl = `${baseUrl}/${restaurant.logoUrl}`;
        }

        // Enrich with user info
        if (restaurant.users && restaurant.users.length > 0) {
          const user = restaurant.users[0];
          restaurant.email = user.email;
          restaurant.password = '********';
        }
        delete restaurant.users;

        // Transform Menu Image URLs
        if (restaurant.menus && Array.isArray(restaurant.menus)) {
          restaurant.menus = restaurant.menus.map((menu: any) => {
            if (menu.imageUrl && !menu.imageUrl.startsWith('http')) {
              menu.imageUrl = `${baseUrl}/${menu.imageUrl}`;
            }
            return menu;
          });
        }

        return {
          ...restaurant,
          isVisibleOnScreen: config.isVisibleOnScreen
        };
      });
      delete screen.restaurantConfigs;
    }

    // Enrich screen with user credentials
    if (screen.users && screen.users.length > 0) {
      const user = screen.users[0];
      screen.email = user.email;
      screen.password = '********';
    }
    delete screen.users;

    return screen;
  }

  async getAll(req: any, res: any) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await screenService.findAll(page, limit);
      
      // Transform screens to flatten restaurants
      const transformedScreens = result.items.map(s => this.transformScreen(s));
      
      // Separate data and metadata for the response
      const { items, ...meta } = result;
      sendResponse(res, transformedScreens, 'Screens fetched successfully', 200, meta);
    } catch (error) {
      console.error('Error fetching screens:', error);
      sendError(res, 'Failed to fetch screens');
    }
  }

  async getOne(req: any, res: any) {
    try {
      const { id } = req.params;
      
      // Access Control: Allow if Super Admin OR if the user is a Screen requesting its own config
      const user = req.user;
      if (user) {
          // If the user's role is SCREEN, ensure they are requesting their own ID
          if (user.role === 'SCREEN' && user.screenId !== id) {
             return sendError(res, 'Forbidden', 403);
          }
           // If Role is neither SUPER_ADMIN nor SCREEN (e.g. RESTAURANT or USER), deny
          if (user.role !== 'SUPER_ADMIN' && user.role !== 'SCREEN') {
              return sendError(res, 'Forbidden', 403);
          }
      } 
      
      const screen = await screenService.findById(id);
      if (!screen) {
        return sendError(res, 'Screen not found', 404);
      }
      sendResponse(res, this.transformScreen(screen));
    } catch (error) {
      sendError(res, 'Failed to fetch screen');
    }
  }

  async create(req: any, res: any) {
    try {
      const data = req.body;
      const screen = await screenService.create(data);
      sendResponse(res, screen, 'Screen created successfully', 201);
    } catch (error) {
      sendError(res, 'Failed to create screen');
    }
  }

  async unassignRestaurant(req: any, res: any) {
      try {
          const { id } = req.params;
          const { restaurantId } = req.body;
          if (!restaurantId) return sendError(res, 'Missing restaurantId', 400);

          await screenService.unassignRestaurant(id, restaurantId);
          sendResponse(res, null, 'Restaurant unassigned from screen');
      } catch (error) {
          console.error(error);
          sendError(res, 'Failed to unassign restaurant');
      }
  }

  async assignRestaurant(req: any, res: any) {
      try {
          const { id } = req.params;
          const { restaurantId, isVisibleOnScreen } = req.body;
          const result = await screenService.assignRestaurant(id, restaurantId, isVisibleOnScreen ?? true);
          sendResponse(res, result, 'Restaurant assigned to screen');
    } catch (error) {
      console.error(error);
      sendError(res, 'Failed to assign restaurant');
    }
  }

  async update(req: any, res: any) {
    try {
      const { id } = req.params;
      const data = req.body;
      const screen = await screenService.update(id, data);
      if (!screen) {
        return sendError(res, 'Screen not found', 404);
      }
      sendResponse(res, screen, 'Screen updated successfully');
    } catch (error) {
      console.error('Error updating screen:', error);
      sendError(res, 'Failed to update screen');
    }
  }

  async getMyRestaurants(req: any, res: any) {
    try {
      const screenId = req.user?.screenId;
      
      if (!screenId) {
        return sendError(res, 'No screen associated with this user', 400);
      }

      const screen = await screenService.findById(screenId);
      if (!screen) {
        return sendError(res, 'Screen not found', 404);
      }

      const transformedScreen = this.transformScreen(screen);
      const availableRestaurants = (transformedScreen.restaurants || []).filter((r: any) => r.isActive === true);
      sendResponse(res, availableRestaurants, 'Restaurants fetched successfully');
    } catch (error) {
      console.error('Error fetching my restaurants:', error);
      sendError(res, 'Failed to fetch restaurants');
    }
  }

  async delete(req: any, res: any) {
    try {
      const { id } = req.params;
      await screenService.delete(id);
      sendResponse(res, null, 'Screen deleted successfully');
    } catch (error) {
      console.error('Error deleting screen:', error);
      sendError(res, 'Failed to delete screen');
    }
  }
}
