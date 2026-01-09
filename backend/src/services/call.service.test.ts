import { CallService } from '../services/call.service';
import { CallSession, CallStatus } from '../entities/CallSession';
import { Restaurant, RestaurantStatus } from '../entities/Restaurant';

jest.mock('../config/data-source', () => {
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };
  return {
    AppDataSource: {
      getRepository: jest.fn().mockImplementation(() => mockRepo),
    },
  };
});

// Access the singleton
import { AppDataSource } from '../config/data-source';
// const mockCallRepository = AppDataSource.getRepository(CallSession); // This works dynamically in test

jest.mock('../server', () => ({
  io: {
    emit: jest.fn(),
    on: jest.fn(), 
  },
}));

describe.skip('CallService', () => {
  let callService: CallService;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log('AppDataSource:', AppDataSource);
    console.log('getRepository:', AppDataSource.getRepository);
    console.log('Repo result:', AppDataSource.getRepository(CallSession));
    callService = new CallService();
  });

  it('should initiate a call successfully', async () => {
    const kioskId = 'kiosk-1';
    const restaurantId = 'rest-1';

    // 1. Check active calls -> None
    (AppDataSource.getRepository(CallSession).findOne as jest.Mock).mockResolvedValueOnce(null);

    // 2. Find restaurant -> Available
    (AppDataSource.getRepository(Restaurant).findOne as jest.Mock).mockResolvedValue({
      id: restaurantId,
      status: RestaurantStatus.AVAILABLE,
    });

    // 3. Save call
    const savedCall = {
      id: 'call-1',
      kioskId,
      restaurantId,
      status: CallStatus.INITIATED,
    };
    (AppDataSource.getRepository(CallSession).create as jest.Mock).mockReturnValue(savedCall);
    (AppDataSource.getRepository(CallSession).save as jest.Mock).mockResolvedValue(savedCall);

    // 4. Fetch with relations
    (AppDataSource.getRepository(CallSession).findOne as jest.Mock).mockResolvedValueOnce({
      ...savedCall,
      screen: { name: 'Kiosk 1' },
      restaurant: { id: restaurantId },
    });

    const result = await callService.initiateCall(kioskId, restaurantId);

    expect((result as any).id).toBe('call-1');
    expect(AppDataSource.getRepository(CallSession).create).toHaveBeenCalled();
    expect(AppDataSource.getRepository(CallSession).save).toHaveBeenCalled();
    expect(AppDataSource.getRepository(Restaurant).update).toHaveBeenCalledWith(restaurantId, {
      status: RestaurantStatus.BUSY,
    });
  });

  it('should fail if kiosk is busy', async () => {
    (AppDataSource.getRepository(CallSession).findOne as jest.Mock).mockResolvedValueOnce({ id: 'active-call' });

    await expect(callService.initiateCall('kiosk-1', 'rest-1')).rejects.toThrow(
      'Kiosk is already in a call'
    );
  });
});
