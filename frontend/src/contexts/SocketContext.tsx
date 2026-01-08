import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  startRestaurantRetry: (restaurantId: string) => void;
  stopRestaurantRetry: () => void;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = '';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'], // Prefer websocket for better performance
      autoConnect: true,
      reconnectionDelay: 30000,
      reconnectionDelayMax: 30000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.onAny((eventName, ...args) => {
      console.log(`[Socket Event] ${eventName}:`, args);
    });

    socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
    });

    // Handle Global Refresh from Super Admin
    socketInstance.on('global:refresh', () => {
      console.log('🔄 Remote refresh triggered by Super Admin');
      window.location.reload();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, []);

  // Restaurant retry mechanism
  const startRestaurantRetry = (restaurantId: string) => {
    console.log('Starting restaurant retry mechanism for:', restaurantId);
    
    // Clear any existing interval
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }
    
    // If socket is already connected, just emit once and don't retry
    if (socket && socket.connected) {
      console.log('Socket already connected, emitting once without retry');
      socket.emit('restaurant:online', { restaurantId });
      return;
    }
    
    // Attempt to emit restaurant:online every 30 seconds only if disconnected
    const interval = setInterval(() => {
      if (socket && socket.connected) {
        console.log('Retrying restaurant:online emission for:', restaurantId);
        socket.emit('restaurant:online', { restaurantId });
        // Stop retrying after successful emission
        clearInterval(interval);
        retryIntervalRef.current = null;
      } else {
        console.log('Socket not connected, waiting for connection...');
      }
    }, 30000); // 30 seconds
    
    retryIntervalRef.current = interval;
  };

  const stopRestaurantRetry = () => {
    console.log('Stopping restaurant retry mechanism');
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (socket && !socket.connected) {
      console.log('🔌 Manually connecting socket...');
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Manually disconnecting socket...');
      socket.disconnect();
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, startRestaurantRetry, stopRestaurantRetry, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
