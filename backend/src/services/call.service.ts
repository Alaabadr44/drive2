import { AppDataSource } from '../config/data-source';
import { LockService } from './lock.service';
import { CallSession, CallStatus } from '../entities/CallSession';
import { Restaurant, RestaurantStatus } from '../entities/Restaurant';
import { io } from '../server';
import { In, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere } from 'typeorm';

export class CallService {
  private callRepository = AppDataSource.getRepository(CallSession);
  private restaurantRepository = AppDataSource.getRepository(Restaurant);

  async initiateCall(kioskId: string, restaurantId: string, initiatedBy: "SCREEN" | "RESTAURANT" = "SCREEN") {
    // 1. Check if Kiosk is already in a call
    const activeKioskCall = await this.callRepository.findOne({
      where: {
        kioskId,
        status: In([CallStatus.INITIATED, CallStatus.RINGING, CallStatus.ACTIVE]),
      },
    });

    if (activeKioskCall) {
      // Check for stale calls (e.g., > 5 mins old)
      const STALE_THRESHOLD_MS = 5 * 60 * 1000;
      const isStale = (Date.now() - activeKioskCall.startTime.getTime()) > STALE_THRESHOLD_MS;

      if (isStale) {
          console.log(`[CallService] 🧹 Cleaning up stale call ${activeKioskCall.id}`);
          await this.callRepository.update(activeKioskCall.id, {
              status: CallStatus.ENDED,
              endTime: new Date(),
              durationSec: 0 
          });
          // Release lock just in case it's still held
          await LockService.releaseCallLock(activeKioskCall.restaurantId, activeKioskCall.id);
      } else {
          throw new Error('Kiosk is already in a call');
      }
    }

    // 2. Check if Restaurant is available
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) throw new Error('Restaurant not found');

    if (restaurant.status === RestaurantStatus.OFFLINE) {
      throw new Error('Restaurant is offline');
    }

    // 3. Create Session (Optimistic creation to get callId for lock)
    const call = this.callRepository.create({
      kioskId,
      restaurantId,
      status: CallStatus.INITIATED,
      initiatedBy
    });
    const savedCall = await this.callRepository.save(call);

    // 4. Atomic Lock Acquisition
    const isLocked = await LockService.acquireCallLock(restaurantId, savedCall.id);
    if (!isLocked) {
        // Rollback: Failed to acquire lock (busy)
        await this.callRepository.delete(savedCall.id); 
        throw new Error('Restaurant is busy');
    }

    // Fetch relations
    const callWithRelations = await this.callRepository.findOne({
      where: { id: savedCall.id },
      relations: { restaurant: true, screen: true },
    });

    if (!callWithRelations) {
        // Should not happen, but cleanup if it does
        await LockService.releaseCallLock(restaurantId, savedCall.id);
        throw new Error('Failed to create call session');
    }

    // 5. Notify via Socket (Targeted)
    // Notify Restaurant
    io.to(`restaurant-${restaurantId}`).emit('call:incoming', {
      restaurantId,
      kioskId,
      kioskName: callWithRelations.screen.name,
      callId: callWithRelations.id,
    });
    
    // Notify Screen
    io.to(`screen-${kioskId}`).emit('call:status', {
        status: 'RINGING',
        callId: callWithRelations.id
    });

    return callWithRelations;
  }

  async endCall(callId: string, orderNumber?: string) {
    const call = await this.callRepository.findOne({ where: { id: callId } });
    if (!call) throw new Error('Call not found');

    const durationSec = Math.floor((Date.now() - call.startTime.getTime()) / 1000);

    // Update call
    await this.callRepository.update(callId, {
      status: CallStatus.ENDED,
      endTime: new Date(),
      durationSec,
      orderNumber,
    });

    const updatedCall = await this.callRepository.findOne({ where: { id: callId } });

    // Release Restaurant Lock
    await LockService.releaseCallLock(call.restaurantId, callId);

    // Notify completion
    const event = { callId, restaurantId: call.restaurantId, orderNumber };
    io.to(`restaurant-${call.restaurantId}`).emit('call:ended', event);
    io.to(`screen-${call.kioskId}`).emit('call:ended', event);

    return updatedCall;
  }

  // Heartbeat or Status update
  async updateStatus(callId: string, status: CallStatus) {
    await this.callRepository.update(callId, { status });
    return this.callRepository.findOne({ where: { id: callId } });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      screenId?: string;
      restaurantId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: FindOptionsWhere<CallSession> = {};

    if (filters) {
      if (filters.screenId) {
        where.kioskId = filters.screenId;
      }
      if (filters.restaurantId) {
        where.restaurantId = filters.restaurantId;
      }
      if (filters.startDate && filters.endDate) {
        where.startTime = Between(filters.startDate, filters.endDate);
      } else if (filters.startDate) {
        where.startTime = MoreThanOrEqual(filters.startDate);
      } else if (filters.endDate) {
        where.startTime = LessThanOrEqual(filters.endDate);
      }
    }

    const [items, total] = await this.callRepository.findAndCount({
      where,
      relations: { screen: true, restaurant: true },
      order: { startTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async saveRecording(callId: string, recordingUrl: string) {
    const call = await this.callRepository.findOne({ where: { id: callId } });
    
    if (!call) {
        throw new Error('Call not found');
    }

    // Identical-request protection: If recording exists, ignore subsequent uploads
    if (call.recordingUrl) {
        console.log(`[CallService] ⚠️ Recording already exists for call ${callId}. Ignoring duplicate upload.`);
        return call;
    }

    await this.callRepository.update(callId, { recordingUrl });
    return this.callRepository.findOne({ where: { id: callId } });
  }
}
