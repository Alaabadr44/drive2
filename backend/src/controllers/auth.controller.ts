import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { sendResponse, sendError } from '../utils/response';
import { io } from '../server';
import { RestaurantService } from '../services/restaurant.service';
import { ScreenService } from '../services/screen.service';
import { getLocalIpAddress } from '../utils/network';
import { RestaurantStatus } from '../entities/Restaurant';

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthController {
  private userRepository = AppDataSource.getRepository(User);

  async login(req: any, res: any) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }

      // Find user by email with relations to check isActive status
      const user = await this.userRepository.findOne({ 
        where: { email },
        relations: { restaurant: true, screen: true }
      });

      if (!user) {
        return sendError(res, 'Invalid credentials', 401);
      }

      // Check if the associated entity is active
      if (user.role === 'RESTAURANT' && user.restaurant && !user.restaurant.isActive) {
        return sendError(res, 'Login failed: Restaurant is inactive', 403);
      }
      if (user.role === 'SCREEN' && user.screen && !user.screen.isActive) {
        return sendError(res, 'Login failed: Screen is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid credentials', 401);
      }

      // Generate JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role, 
          restaurantId: user.restaurantId,
          screenId: user.screenId 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Socket.IO: Emit online event if user is a restaurant
      if (user.role === 'RESTAURANT' && user.restaurantId) {
          const restaurantService = new RestaurantService();
          
          // Update status in DB
          await restaurantService.update(user.restaurantId, { status: RestaurantStatus.AVAILABLE });

          const screenIds = await restaurantService.findAssignedScreens(user.restaurantId);
          console.log(`[SOCKET] 📢 Restaurant ${user.restaurantId} logged in. Notifying ${screenIds.length} screens.`);
          
          screenIds.forEach(screenId => {
              const room = `screen-${screenId}`;
              io.to(room).emit('restaurant:online', {
                  restaurantId: user.restaurantId
              });
              console.log(`[SOCKET]    -> Emitted restaurant:online to ${room}`);
          });
      }

      sendResponse(res, { token, user: { id: user.id, email: user.email, role: user.role } }, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);
      sendError(res, 'Login failed');
    }
  }

  async logout(req: any, res: any) {
    try {
        const user = req.user;
        if (user && user.role === 'RESTAURANT' && user.restaurantId) {
            const restaurantService = new RestaurantService();

            // Update status in DB
            await restaurantService.update(user.restaurantId, { status: RestaurantStatus.OFFLINE });

            const screenIds = await restaurantService.findAssignedScreens(user.restaurantId);
            console.log(`[SOCKET] 📢 Restaurant ${user.restaurantId} logged out. Notifying ${screenIds.length} screens.`);

            screenIds.forEach(screenId => {
                const room = `screen-${screenId}`;
                io.to(room).emit('restaurant:offline', {
                    restaurantId: user.restaurantId
                });
                console.log(`[SOCKET]    -> Emitted restaurant:offline to ${room}`);
            });
        } else if (user && user.role === 'SCREEN' && user.screenId) {
            const screenService = new ScreenService();
            const screen = await screenService.findById(user.screenId);
            
            if (screen && screen.restaurantConfigs) {
                console.log(`[SOCKET] 📢 Screen ${user.screenId} logged out. Notifying assigned restaurants.`);
                screen.restaurantConfigs.forEach(config => {
                    const room = `restaurant-${config.restaurantId}`;
                    io.to(room).emit('screen:offline', {
                        screenId: user.screenId
                    });
                    console.log(`[SOCKET]    -> Emitted screen:offline to ${room}`);
                });
            }
        }
        sendResponse(res, null, 'Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        sendError(res, 'Logout failed');
    }
  }

  async getProfile(req: any, res: any) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }

      // Find user with related restaurant or screen
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: {
          restaurant: {
             menus: true,
             screenConfigs: {
                 screen: true
             }
          },
          screen: {
            restaurantConfigs: {
              restaurant: {
                menus: true
              }
            }
          }
        },
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Check if associated restaurant or screen is still active
      if (user.role === 'RESTAURANT' && user.restaurant && !user.restaurant.isActive) {
        return sendError(res, 'Unauthorized: Your restaurant is inactive', 401);
      }
      if (user.role === 'SCREEN' && user.screen && !user.screen.isActive) {
        return sendError(res, 'Unauthorized: Your screen is inactive', 401);
      }

      // Transform Restaurant URLs if present
      const port = process.env.PORT || 3000;
      const baseUrl = process.env.APP_URL || `http://${getLocalIpAddress()}:${port}`;

      let assignedScreens: any = null;

      if (user.restaurant) {
          if (user.restaurant.logoUrl && !user.restaurant.logoUrl.startsWith('http')) {
              user.restaurant.logoUrl = `${baseUrl}/${user.restaurant.logoUrl}`;
          }
           // Transform Menu Image URLs
            if (user.restaurant.menus && Array.isArray(user.restaurant.menus)) {
              user.restaurant.menus = user.restaurant.menus.map((menu: any) => {
                if (menu.imageUrl && !menu.imageUrl.startsWith('http')) {
                  menu.imageUrl = `${baseUrl}/${menu.imageUrl}`;
                }
                return menu;
              });
            }
            
            // Flatten assigned screens for easier consumption
            if (user.restaurant.screenConfigs) {
                assignedScreens = user.restaurant.screenConfigs
                    .filter(config => config.isVisibleOnScreen)
                    .map(config => ({
                        id: config.screen.id,
                        name: config.screen.name,
                        isActive: config.screen.isActive
                    }));
            }
      }

      // Return user profile without password hash
      const profile = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        restaurant: user.restaurant,
        assignedScreens, // Include flattened screen info
        screen: user.screen,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      sendResponse(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      sendError(res, 'Failed to get profile');
    }
  }
}
