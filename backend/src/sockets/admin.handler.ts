import { Socket } from 'socket.io';
import { io } from '../server';
import { ScreenService } from '../services/screen.service';
import { RestaurantService } from '../services/restaurant.service';
import { Restaurant } from '../entities/Restaurant';
import { Screen } from '../entities/Screen';

const screenService = new ScreenService();
const restaurantService = new RestaurantService();

export const registerAdminHandlers = (socket: Socket) => {
  // JOIN SUPER ADMIN ROOM
  socket.on('join:superadmin', () => {
    socket.join('superadmin');
    console.log(`[SOCKET] 👑 Socket ${socket.id} joined room: superadmin`);
  });

  // TRIGGER REFRESH
  socket.on('superadmin:trigger:refresh', (data: { targetType: 'all' | 'restaurant' | 'screen', targetId?: string }) => {
    console.log(`[SOCKET] 👑 SuperAdmin triggered refresh for:`, data);

    if (data.targetType === 'all') {
      io.emit('global:refresh');
    } else if (data.targetType === 'restaurant' && data.targetId) {
      io.to(`restaurant-${data.targetId}`).emit('global:refresh');
    } else if (data.targetType === 'screen' && data.targetId) {
      io.to(`screen-${data.targetId}`).emit('global:refresh');
    }
  });

  // REQUEST GLOBAL STATUS
  socket.on('request:global:status', async () => {
    try {
      console.log(`[SOCKET] 👑 SuperAdmin requesting global status`);
      
      const [restaurants, screensResponse] = await Promise.all([
        restaurantService.findAll(),
        screenService.findAll(1, 100) // Get more screens if many exist
      ]);

      const restaurantStatus = await Promise.all(restaurants.map(async (r: Restaurant) => {
        const sockets = await io.in(`restaurant-${r.id}`).fetchSockets();
        return {
          id: r.id,
          name: r.nameEn || r.nameAr,
          online: sockets.length > 0
        };
      }));

      const screenStatus = await Promise.all(screensResponse.items.map(async (s: Screen) => {
        const sockets = await io.in(`screen-${s.id}`).fetchSockets();
        return {
          id: s.id,
          name: s.name,
          online: sockets.length > 0
        };
      }));

      socket.emit('global:status:response', {
        restaurants: restaurantStatus,
        screens: screenStatus
      });
    } catch (error) {
      console.error('[SOCKET] ❌ Error fetching global status:', error);
    }
  });
};
