import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { socket, stopRestaurantRetry, connect, disconnect } = useSocket();

  useEffect(() => {
    const initAuth = async () => {
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          setUser(savedUser); // Set initial user from storage for immediate UI
          
          if (savedUser.token) {
            connect(); // Ensure socket connects if we have a saved user
            console.log('🔄 Refreshing profile on app load...');
            const fullProfile = await authService.getProfile(savedUser.token);
            const updatedUser = { ...savedUser, ...fullProfile };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('✅ Profile refreshed:', updatedUser);
          }
        } catch (error) {
          console.error('Failed to parse or refresh saved user:', error);
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [connect]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      connect(); // Connect socket on login
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect based on role
      switch (user.role) {
        case 'SUPER_ADMIN':
          navigate('/admin');
          break;
        case 'RESTAURANT':
          // Fetch full profile for restaurant to get restaurant details
          if (user.token) {
            try {
              const fullProfile = await authService.getProfile(user.token);
              const updatedUser = { ...user, ...fullProfile };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('Restaurant profile fetched after login:', updatedUser);
              
              // Emit restaurant:online event after a short delay to ensure socket is connected
              setTimeout(() => {
                if (socket && socket.connected) {
                  const restaurantId = updatedUser.restaurant?.id || updatedUser.id;
                  console.log('🟢 FRONTEND: Emitting restaurant:online for restaurantId:', restaurantId);
                  socket.emit('restaurant:online', { restaurantId });
                } else {
                  console.warn('⚠️ Socket not connected after delay, cannot emit restaurant:online');
                  console.log('Socket state:', { exists: !!socket, connected: socket?.connected });
                }
              }, 500);
            } catch (err) {
              console.error('Failed to fetch profile after login:', err);
            }
          }
          navigate('/restaurant');
          break;
        case 'SCREEN':
          if (user.token) {
            try {
              const fullProfile = await authService.getProfile(user.token);
              const updatedUser = { ...user, ...fullProfile };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('Screen profile fetched after login:', updatedUser);
            } catch (err) {
              console.error('Failed to fetch screen profile after login:', err);
            }
          }
          navigate('/my-restaurants');
          break;
      }
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [navigate, socket, connect]);

  const logout = useCallback(async () => {
    // Stop retry mechanism for restaurants
    if (user?.role === 'RESTAURANT') {
      stopRestaurantRetry();
    }
    
    // Emit offline events BEFORE clearing state
    if (socket && socket.connected) {
      if (user?.role === 'RESTAURANT') {
        const restaurantId = user.restaurant?.id || user.id;
        console.log('🔴 FRONTEND: Emitting restaurant:offline for restaurantId:', restaurantId);
        socket.emit('restaurant:offline', { restaurantId });
      } else if (user?.role === 'SCREEN') {
        const screenId = user.screenId || user.screen?.id || user.id;
        console.log('🔴 FRONTEND: Emitting screen:offline for screenId:', screenId);
        socket.emit('screen:offline', { screenId });
      }
    } else if (user?.role === 'RESTAURANT' || user?.role === 'SCREEN') {
      console.warn(`⚠️ Socket not connected, cannot emit ${user.role.toLowerCase()}:offline`);
    }

    try {
      if (user?.token) {
        await authService.logout(user.token);
      }
    } catch (error) {
      console.error('Logout API call failed, but clearing local state anyway:', error);
    } finally {
      // Always clear local state regardless of API success
      setUser(null);
      localStorage.removeItem('user');
      disconnect(); // Explicitly disconnect socket
      navigate('/login');
    }
  }, [user, socket, stopRestaurantRetry, navigate, disconnect]);

  // Global Auto-Logout on 401
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('🚨 Received 401 Unauthorized - Logging out...');
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    // Get token from state or localStorage
    const savedUserStr = localStorage.getItem('user');
    const token = savedUserStr ? JSON.parse(savedUserStr).token : null;
    
    if (!token) return null;
    
    try {
      console.log('🔄 Explicitly refreshing profile...');
      const fullProfile = await authService.getProfile(token);
      
      let updatedUser: User | null = null;
      setUser(prev => {
        if (!prev) return null;
        updatedUser = { ...prev, ...fullProfile };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      });
      
      console.log('✅ Profile refreshed successfully');
      return updatedUser;
    } catch (error) {
      console.error('Failed to explicitly refresh profile:', error);
      return null;
    }
  }, []); // Stable reference!

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
