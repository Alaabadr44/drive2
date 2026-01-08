export interface Call {
  id: string;
  screenName: string;
  timestamp: Date;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
}

const MOCK_CALLS: Call[] = [
  {
    id: '1',
    screenName: 'Screen 1 (Kitchen)',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    status: 'PENDING',
  },
  {
    id: '2',
    screenName: 'Screen 2 (Bar)',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    status: 'ACTIVE',
  },
  {
    id: '3',
    screenName: 'Screen 1 (Kitchen)',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    status: 'COMPLETED',
  },
   {
    id: '4',
    screenName: 'Screen 3 (Patio)',
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago
    status: 'PENDING',
  },
];

export const callService = {
  getCalls: async (): Promise<Call[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [...MOCK_CALLS].sort((a, b) => {
        // Sort: Active first, then Pending, then Completed
        const statusOrder = { ACTIVE: 0, PENDING: 1, COMPLETED: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
    });
  },

  acceptCall: async (id: string): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const call = MOCK_CALLS.find(c => c.id === id);
      if (call) {
          call.status = 'ACTIVE';
      }
  },

  endCall: async (id: string): Promise<void> => {
     await new Promise((resolve) => setTimeout(resolve, 300));
     const call = MOCK_CALLS.find(c => c.id === id);
     if (call) {
         call.status = 'COMPLETED';
     }
  },

  createDummyCall: async (): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const screens = ['Kitchen', 'Bar', 'Patio', 'Dining Room', 'Takeout Counter'];
      const randomScreen = screens[Math.floor(Math.random() * screens.length)];
      const newCall: Call = {
          id: Date.now().toString(),
          screenName: `Screen ${MOCK_CALLS.length + 1} (${randomScreen})`,
          timestamp: new Date(),
          status: 'PENDING',
      };
      MOCK_CALLS.push(newCall);
  }
};
