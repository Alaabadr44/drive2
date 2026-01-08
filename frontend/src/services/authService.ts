import { api } from './api';
import { Restaurant, mockRestaurants, Screen } from '../data/mockData';

export type Role = 'SUPER_ADMIN' | 'RESTAURANT' | 'SCREEN';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  token?: string;
  restaurant?: Restaurant;
  screen?: Screen;
  restaurantId?: string;
  screenId?: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    // Try API login first
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data; // Access the nested data object
      return {
        id: data.user?.id || 'id',
        email: data.user?.email || email,
        name: data.user?.name || 'User',
        role: data.user?.role || 'SUPER_ADMIN',
        token: data.token,
        restaurant: data.user?.restaurant,
      };
    } catch (error) {
      console.log("API Login failed");
      throw error;
    }
  },

  logout: async (token?: string): Promise<void> => {
    try {
      if (token) {
        await api.post('/auth/logout', {}, token);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // We still want to resolve/succeed so client clears state
    }
  },
  getProfile: async (token: string): Promise<User> => {
    // Mock response for dev/demo
    if (token === 'mock-token-restaurant') {
      return {
        id: '2',
        email: 'burger@king.com',
        name: 'Burger King',
        role: 'RESTAURANT',
        token: token,
        restaurant: mockRestaurants[0]
      };
    }

    const response = await api.get('/auth/profile', token);
    const data = response.data;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      token: token, // Keep the existing token
      restaurant: data.restaurant,
      screen: data.screen,
      restaurantId: data.restaurantId || data.restaurant?.id,
      screenId: data.screenId || data.screen?.id,
    };
  },
};
