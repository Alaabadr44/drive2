import { Socket } from 'socket.io';
import { io } from '../server';
import { CallService } from '../services/call.service';
import { LockService } from '../services/lock.service';
import { ScreenService } from '../services/screen.service';
import { RestaurantService } from '../services/restaurant.service';
import { AppDataSource } from '../config/data-source';

const callService = new CallService();
const screenService = new ScreenService();
const restaurantService = new RestaurantService();

export const registerCallHandlers = (socket: Socket) => {
  // JOIN ROOMS
  socket.on('join:restaurant', (restaurantId: string) => {
    const room = `restaurant-${restaurantId}`;
    socket.join(room);
    (socket as any).restaurantId = restaurantId;
    console.log(`[SOCKET] �� Socket ${socket.id} joined room: ${room}`);

    // Notify Super Admin
    io.to('superadmin').emit('restaurant:connected', { restaurantId });
  });

  socket.on('join:screen', (screenId: string) => {
    const room = `screen-${screenId}`;
    socket.join(room);
    (socket as any).screenId = screenId;
    console.log(`[SOCKET] 📺 Socket ${socket.id} joined room: ${room}`);

    // Notify Super Admin
    io.to('superadmin').emit('screen:connected', { screenId });
  });

  // RESTAURANT ONLINE
  socket.on('restaurant:online', async (data: { restaurantId: string }) => {
    console.log(`[SOCKET] 🍳 Backend received restaurant:online for restaurant ${data.restaurantId}`);
    try {
      // Ensure socket is in the room
      socket.join(`restaurant-${data.restaurantId}`);
      (socket as any).restaurantId = data.restaurantId;

      const screenIds = await restaurantService.findAssignedScreens(data.restaurantId);
      console.log(`[SOCKET]    -> Notifying ${screenIds.length} screens.`);
      
      screenIds.forEach(screenId => {
        const room = `screen-${screenId}`;
        io.to(room).emit('restaurant:online', { restaurantId: data.restaurantId });
        console.log(`[SOCKET]    -> Emitted restaurant:online to ${room}`);
      });

      // Also notify Super Admin
      io.to('superadmin').emit('restaurant:connected', { restaurantId: data.restaurantId });
    } catch (error) {
      console.error('[SOCKET] ❌ Error forwarding restaurant:online:', error);
    }
  });

  // SCREEN CONNECTED (Screen -> Server -> Restaurant)
  socket.on('screen:connected', (data: { screenId: string; screenName: string; restaurantId: string }) => {
    console.log(`[SOCKET] 🖥️ Backend received screen:connected:`, data);
    
    // Ensure socket is in its room
    socket.join(`screen-${data.screenId}`);
    (socket as any).screenId = data.screenId;

    // Forward this event to the restaurant's room so the restaurant dashboard can see it
    io.to(`restaurant-${data.restaurantId}`).emit('screen:connected', {
      screenId: data.screenId,
      screenName: data.screenName,
      restaurantId: data.restaurantId
    });
    
    console.log(`[SOCKET] ✅ Forwarded screen:connected to restaurant room: restaurant-${data.restaurantId}`);

    // Forward to Super Admin
    io.to('superadmin').emit('screen:connected', {
      screenId: data.screenId,
      screenName: data.screenName,
      restaurantId: data.restaurantId
    });
  });

  // SCREEN OFFLINE (Screen -> Server -> Restaurant)
  socket.on('screen:offline', async (data: { screenId: string }) => {
    console.log(`[SOCKET] 🖥️ Backend received screen:offline for screen ${data.screenId}`);
    try {
      // LEAVE ROOM to ensure global status checks see it as offline
      const room = `screen-${data.screenId}`;
      socket.leave(room);
      delete (socket as any).screenId;
      console.log(`[SOCKET] 🚪 Socket ${socket.id} left room: ${room}`);

      const screen = await screenService.findById(data.screenId);
      if (screen && screen.restaurantConfigs) {
        screen.restaurantConfigs.forEach(config => {
          const rRoom = `restaurant-${config.restaurantId}`;
          io.to(rRoom).emit('screen:offline', { screenId: data.screenId });
          console.log(`[SOCKET]    -> Forwarded screen:offline to ${rRoom}`);
        });
      }
      
      // Forward to Super Admin
      io.to('superadmin').emit('screen:offline', { screenId: data.screenId });
    } catch (error) {
      console.error('[SOCKET] ❌ Error forwarding screen:offline:', error);
    }
  });

  // RESTAURANT OFFLINE
  socket.on('restaurant:offline', async (data: { restaurantId: string }) => {
    console.log(`[SOCKET] 🍳 Backend received restaurant:offline for restaurant ${data.restaurantId}`);
    try {
      // LEAVE ROOM
      const room = `restaurant-${data.restaurantId}`;
      socket.leave(room);
      delete (socket as any).restaurantId;
      console.log(`[SOCKET] 🚪 Socket ${socket.id} left room: ${room}`);

      const screenIds = await restaurantService.findAssignedScreens(data.restaurantId);
      screenIds.forEach(screenId => {
        const sRoom = `screen-${screenId}`;
        io.to(sRoom).emit('restaurant:offline', { restaurantId: data.restaurantId });
        console.log(`[SOCKET]    -> Emitted restaurant:offline to ${sRoom}`);
      });

      // Forward to Super Admin
      io.to('superadmin').emit('restaurant:offline', { restaurantId: data.restaurantId });
    } catch (error) {
       console.error('[SOCKET] ❌ Error forwarding restaurant:offline:', error);
    }
  });

  // DISCONNECT HANDLING
  socket.on('disconnect', async () => {
    const screenId = (socket as any).screenId;
    const restaurantId = (socket as any).restaurantId;

    if (screenId) {
      console.log(`[SOCKET] 🔌 Screen ${screenId} disconnected. Notifying restaurants.`);
      try {
        const screen = await screenService.findById(screenId);
        if (screen && screen.restaurantConfigs) {
          screen.restaurantConfigs.forEach(config => {
            const room = `restaurant-${config.restaurantId}`;
            io.to(room).emit('screen:offline', { screenId });
          });
        }

        // Notify Super Admin
        io.to('superadmin').emit('screen:offline', { screenId });
      } catch (error) {
        console.error('[SOCKET] ❌ Error in screen disconnect status update:', error);
      }
    }

    if (restaurantId) {
      console.log(`[SOCKET] 🔌 Restaurant ${restaurantId} disconnected. Notifying screens industrial.`);
      try {
        const screenIds = await restaurantService.findAssignedScreens(restaurantId);
        screenIds.forEach(screenId => {
          const room = `screen-${screenId}`;
          io.to(room).emit('restaurant:offline', { restaurantId });
        });
        // Notify Super Admin
        io.to('superadmin').emit('restaurant:offline', { restaurantId });
      } catch (error) {
        console.error('[SOCKET] ❌ Error in restaurant disconnect status update:', error);
      }
    }
  });

  // REQUEST RESTAURANT STATUS (Screen -> Server)
  socket.on('request:restaurant:status', async (data: { screenId: string }) => {
    try {
      console.log(`[SOCKET] 🔄 Screen requesting restaurant status: ${data.screenId}`);
      
      const screen = await screenService.findById(data.screenId);
      
      if (!screen || !screen.restaurantConfigs) {
        console.log(`[SOCKET] ⚠️ No restaurants found for screen ${data.screenId}`);
        return;
      }

      for (const config of screen.restaurantConfigs) {
        const restaurantId = config.restaurant.id;
        const restaurantRoom = `restaurant-${restaurantId}`;
        
        const socketsInRoom = await io.in(restaurantRoom).fetchSockets();
        const isRestaurantOnline = socketsInRoom.length > 0;
        
        if (isRestaurantOnline) {
          console.log(`[SOCKET] ✅ Restaurant ${restaurantId} is online, notifying screen ${data.screenId}`);
          socket.emit('restaurant:online', { 
            restaurantId: restaurantId 
          });
        }
      }
    } catch (error) {
      console.error('[SOCKET] ❌ Error handling request:restaurant:status:', error);
    }
  });

  // REQUEST SCREEN STATUS (Restaurant -> Server)
  socket.on('request:screen:status', async (data: { restaurantId: string }) => {
    try {
      console.log(`[SOCKET] 🔄 Restaurant requesting screen status: ${data.restaurantId}`);
      
      const restaurant = await restaurantService.findById(data.restaurantId);
      
      if (!restaurant || !restaurant.screenConfigs) {
        console.log(`[SOCKET] ⚠️ No screens found for restaurant ${data.restaurantId}`);
        return;
      }

      for (const config of restaurant.screenConfigs) {
        const screenId = config.screen.id;
        const screenName = config.screen.name;
        const screenRoom = `screen-${screenId}`;
        
        const socketsInRoom = await io.in(screenRoom).fetchSockets();
        const isScreenOnline = socketsInRoom.length > 0;
        
        if (isScreenOnline) {
          console.log(`[SOCKET] ✅ Screen ${screenId} is online, notifying restaurant ${data.restaurantId}`);
          socket.emit('screen:connected', {
            screenId: screenId,
            screenName: screenName,
            restaurantId: data.restaurantId
          });
        }
      }
    } catch (error) {
      console.error('[SOCKET] ❌ Error handling request:screen:status:', error);
    }
  });

  // CALL HANDLERS...
  socket.on('call:request', async (data: { restaurantId: string; screenId: string }) => {
    try {
      console.log(`[SOCKET] 📞 Call requested by Screen ${data.screenId} for Restaurant ${data.restaurantId}`);
      const call = await callService.initiateCall(data.screenId, data.restaurantId, 'SCREEN');
      io.to(`screen-${data.screenId}`).emit('call:status', { status: 'RINGING', callId: call.id });
    } catch (error: any) {
      console.error('[SOCKET] ❌ Call request failed:', error.message);
      io.to(`screen-${data.screenId}`).emit('call:status', { status: 'BUSY', message: error.message });
    }
  });

  socket.on('call:accept', async (data: { callId: string }) => {
    try {
      console.log(`[SOCKET] 📞 Call accepted: ${data.callId} by socket ${socket.id}`);
      const call = await callService.updateStatus(data.callId, 'ACTIVE' as any);
      if (call) {
        // Notify Screen
        io.to(`screen-${call.kioskId}`).emit('call:accepted', { callId: call.id });
        console.log(`[SOCKET]    -> Notified Screen: screen-${call.kioskId}`);

        // Notify Restaurant (Sender) - vital for confirmation
        io.to(`restaurant-${call.restaurantId}`).emit('call:accepted', { callId: call.id });
        console.log(`[SOCKET]    -> Notified Restaurant: restaurant-${call.restaurantId}`);

        // Notify Super Admin (Non-critical side channel)
        try {
           io.to('superadmin').emit('admin:call-started', { 
               callId: call.id,
               kioskId: call.kioskId,
               restaurantId: call.restaurantId,
               startTime: new Date()
           });
        } catch (adminError) {
           console.error('[SOCKET] ⚠️ Failed to notify admin of start (Non-critical):', adminError);
        }
      }
    } catch (error) {
        console.error("Error accepting call", error);
    }
  });

  socket.on('call:reject', async (data: { callId: string }) => {
    try {
      await callService.endCall(data.callId);
    } catch (error) {
        console.error("Error rejecting call", error);
    }
  });

  socket.on('call:end', async (data: { callId: string, orderNumber?: string }) => {
      try {
          const finishedCall = await callService.endCall(data.callId, data.orderNumber);
          
          // Notify Super Admin (Non-critical side channel)
          try {
             if (finishedCall) {
                 io.to('superadmin').emit('admin:call-ended', { 
                     callId: finishedCall.id,
                     durationSec: finishedCall.durationSec,
                     status: finishedCall.status
                 });
             }
          } catch (adminError) {
             console.error('[SOCKET] ⚠️ Failed to notify admin of end (Non-critical):', adminError);
          }

      } catch (error) {
           console.error("Error ending call", error);
      }
  });

  socket.on('webrtc:signal', (data: { targetId: string; targetType: 'screen' | 'restaurant'; type: string; payload: any, callId: string }) => {
      const room = data.targetType === 'screen' ? `screen-${data.targetId}` : `restaurant-${data.targetId}`;
      console.log(`[SOCKET] 📶 WebRTC Signal (${data.type}) from ${socket.id} -> ${room}`);
      
      socket.to(room).emit('webrtc:signal', {
          type: data.type,
          payload: data.payload,
          callId: data.callId,
          senderId: socket.id
      });
  });
};
