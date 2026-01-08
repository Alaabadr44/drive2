import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Restaurant, Screen, mockRestaurants, mockScreens } from '../data/mockData';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface DashboardStats {
    totalRestaurants: number;
    totalScreens: number;
    activeCalls: number;
    systemStatus: string;
}

export interface LiveCall {
    callId: string;
    restaurantId: string;
    kioskId: string;
    startTime: string;
}

interface AdminContextType {
    restaurants: Restaurant[];
    screens: Screen[];
    stats: DashboardStats | null;
    isLoading: boolean;
    addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<string | undefined>;
    updateRestaurant: (id: string, updates: Partial<Restaurant>) => Promise<void>;
    deleteRestaurant: (id: string) => Promise<void>;
    activateRestaurant: (id: string) => Promise<void>;
    deactivateRestaurant: (id: string) => Promise<void>;
    addScreen: (screen: Omit<Screen, 'id'>) => Promise<string | undefined>;
    updateScreen: (id: string, updates: Partial<Screen>) => Promise<void>;
    deleteScreen: (id: string) => Promise<void>;
    fetchScreens: (page?: number, limit?: number) => Promise<void>;
    assignRestaurantToScreen: (screenId: string, restaurantId: string, isVisibleOnScreen?: boolean) => Promise<void>;
    unassignRestaurantFromScreen: (screenId: string, restaurantId: string) => Promise<void>;
    entityStatuses: {
        restaurants: Record<string, boolean>;
        screens: Record<string, boolean>;
    };
    liveCalls: LiveCall[];
    triggerRefresh: (targetType: 'all' | 'restaurant' | 'screen', targetId?: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [screens, setScreens] = useState<Screen[]>(() => {
        const saved = localStorage.getItem('screens');
        const initial = saved ? JSON.parse(saved) : mockScreens;
        return initial.map((s: Screen) => ({
            ...s,
            assignedRestaurants: s.assignedRestaurants || []
        }));
    });
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [entityStatuses, setEntityStatuses] = useState<{ restaurants: Record<string, boolean>, screens: Record<string, boolean> }>({
        restaurants: {},
        screens: {}
    });
    const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);

    const { socket } = useSocket();

    const fetchStats = useCallback(async () => {
        if (!user?.token) return;
        try {
            const response = await api.get('/dashboard/stats', user.token);
            const statsData = response.data || response;
            setStats({
                totalRestaurants: statsData.totalRestaurants ?? restaurants.length,
                totalScreens: statsData.totalScreens ?? screens.length,
                activeCalls: statsData.activeCalls ?? 0,
                systemStatus: statsData.systemStatus ?? 'Healthy'
            });
        } catch (error) {
            console.error("Failed to fetch stats", error);
            setStats(prev => ({
                totalRestaurants: restaurants.length,
                totalScreens: screens.length,
                activeCalls: prev?.activeCalls || 0,
                systemStatus: 'Healthy'
            }));
        }
    }, [user?.token, restaurants.length, screens.length]);

    // Fetch Restaurants from API
    const fetchRestaurants = useCallback(async () => {
        if (!user?.token) return;
        setIsLoading(true);
        try {
            const response = await api.get('/restaurants', user.token);
            const responseData = response.data || response;
            const items = (responseData.items || (Array.isArray(responseData) ? responseData : [])) as Restaurant[];
            const total = responseData.total || responseData.meta?.totalItems || items.length;
            
            setRestaurants(items);
            
            // Update stats total restaurants
            setStats(prev => prev ? { ...prev, totalRestaurants: total } : {
                totalRestaurants: total,
                totalScreens: screens.length,
                activeCalls: 0,
                systemStatus: 'Healthy'
            });
        } catch (error) {
            console.error("Failed to fetch restaurants", error);
            // Fallback to mock data if API fails (dev mode)
            setRestaurants(mockRestaurants);
        } finally {
            setIsLoading(false);
        }
    }, [user?.token, screens.length]);

    // Fetch Screens from API
    const fetchScreens = useCallback(async (page: number = 1, limit: number = 100) => {
        if (!user?.token) return;
        setIsLoading(true);
        try {
            const response = await api.get(`/screens?page=${page}&limit=${limit}`, user.token);
            
            // Handle both flat array and paginated response
            const responseData = response.data || response;
            const rawScreens = (responseData.items || (Array.isArray(responseData) ? responseData : [])) as Screen[];
            const total = responseData.total || responseData.meta?.totalItems || rawScreens.length;

            const normalizedScreens = rawScreens.map((s) => ({
                ...s,
                assignedRestaurants: s.assignedRestaurants || []
            }));
            
            setScreens(normalizedScreens);
            
            // Update stats total screens if we have it
            setStats(prev => prev ? { ...prev, totalScreens: total } : {
                totalRestaurants: restaurants.length,
                totalScreens: total,
                activeCalls: 0,
                systemStatus: 'Healthy'
            });

        } catch (error) {
            console.error("Failed to fetch screens", error);
            const saved = localStorage.getItem('screens');
            if (saved) setScreens(JSON.parse(saved));
        } finally {
            setIsLoading(false);
        }
    }, [user?.token, restaurants.length]);

    useEffect(() => {
        if (user?.token) {
            fetchRestaurants();
            fetchScreens();
            fetchStats();
        }
    }, [user, user?.token, fetchRestaurants, fetchScreens, fetchStats]);

    // Sync Screens to localStorage
    useEffect(() => {
        localStorage.setItem('screens', JSON.stringify(screens));
    }, [screens]);

    // Super Admin Socket Logic
    useEffect(() => {
        if (!socket || user?.role !== 'SUPER_ADMIN') return;

        console.log('👑 AdminContext: Joining superadmin room');
        socket.emit('join:superadmin');
        socket.emit('request:global:status');

        const handleGlobalStatus = (data: { restaurants: { id: string, online: boolean }[], screens: { id: string, online: boolean }[] }) => {
            console.log('👑 AdminContext: Received global status', data);
            const restaurants: Record<string, boolean> = {};
            const screens: Record<string, boolean> = {};
            
            data.restaurants.forEach((r) => restaurants[r.id] = r.online);
            data.screens.forEach((s) => screens[s.id] = s.online);
            
            setEntityStatuses({ restaurants, screens });
        };

        const handleRestaurantConnected = (data: { restaurantId: string }) => {
            console.log('👑 AdminContext: Restaurant connected', data.restaurantId);
            setEntityStatuses(prev => ({
                ...prev,
                restaurants: { ...prev.restaurants, [data.restaurantId]: true }
            }));
        };

        const handleRestaurantOffline = (data: { restaurantId: string }) => {
            console.log('👑 AdminContext: Restaurant offline', data.restaurantId);
            setEntityStatuses(prev => ({
                ...prev,
                restaurants: { ...prev.restaurants, [data.restaurantId]: false }
            }));
        };

        const handleScreenConnected = (data: { screenId: string }) => {
            console.log('👑 AdminContext: Screen connected', data.screenId);
            setEntityStatuses(prev => ({
                ...prev,
                screens: { ...prev.screens, [data.screenId]: true }
            }));
        };

        const handleScreenOffline = (data: { screenId: string }) => {
            console.log('👑 AdminContext: Screen offline', data.screenId);
            setEntityStatuses(prev => ({
                ...prev,
                screens: { ...prev.screens, [data.screenId]: false }
            }));
        };

        const handleCallStarted = (data: LiveCall) => {
            console.log("🔴 [AdminContext] Live Call Started:", data);
            setLiveCalls(prev => {
                if (prev.find(c => c.callId === data.callId)) return prev;
                return [...prev, data];
            });
        };

        const handleCallEnded = (data: { callId: string }) => {
            console.log("🟢 [AdminContext] Live Call Ended:", data);
            setLiveCalls(prev => prev.filter(c => c.callId !== data.callId));
        };

        socket.on('global:status:response', handleGlobalStatus);
        socket.on('restaurant:connected', handleRestaurantConnected);
        socket.on('restaurant:offline', handleRestaurantOffline);
        socket.on('screen:connected', handleScreenConnected);
        socket.on('screen:offline', handleScreenOffline);
        
        // Listen for live calls (assuming superadmin room receives them as per request)
        socket.on('admin:call-started', handleCallStarted);
        socket.on('admin:call-ended', handleCallEnded);

        return () => {
            socket.off('global:status:response', handleGlobalStatus);
            socket.off('restaurant:connected', handleRestaurantConnected);
            socket.off('restaurant:offline', handleRestaurantOffline);
            socket.off('screen:connected', handleScreenConnected);
            socket.off('screen:offline', handleScreenOffline);
            socket.off('admin:call-started', handleCallStarted);
            socket.off('admin:call-ended', handleCallEnded);
        };
    }, [socket, user?.role]);

    const triggerRefresh = useCallback((targetType: 'all' | 'restaurant' | 'screen', targetId?: string) => {
        if (!socket || user?.role !== 'SUPER_ADMIN') return;
        console.log(`👑 AdminContext: Triggering refresh for ${targetType}`, targetId);
        socket.emit('superadmin:trigger:refresh', { targetType, targetId });
        toast.info(`Refresh triggered for ${targetType === 'all' ? 'all clients' : targetType}`);
    }, [socket, user?.role]);

    const objectToFormData = (obj: Record<string, unknown>) => {
        const formData = new FormData();
        Object.entries(obj).forEach(([key, value]) => {
            // Skip undefined/null
            if (value === undefined || value === null) return;

            // Skip empty password
            if (key === 'password' && value === '') return;

            // Skip string images (existing URLs), only append Files
            if (['logo', 'coverImage', 'menuImage'].includes(key)) {
                if (value instanceof File) {
                    formData.append(key, value);
                }
                 return; // Skip if it's not a file (e.g. existing URL string)
            }

            // New: Handle array of menu images (menuImages field)
            if (key === 'menuImages' && Array.isArray(value)) {
                value.forEach(v => {
                    if (v instanceof File) {
                        formData.append('menuImages', v);
                    } else if (typeof v === 'string') {
                        formData.append('menuImages', v);
                    }
                });
                return;
            }

            if (value instanceof File) {
                formData.append(key, value);
            } else if (typeof value === 'object' && value !== null) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });
        return formData;
    };

    const hasFile = (obj: Record<string, unknown>) => {
        // We always want to use FormData for restaurants to support file uploads potential
        // But strictly speaking, the check is if any value IS a file.
        // However, for updates, we might have no NEW files, but we still want to send other data.
        // The API likely accepts JSON for updates without files, OR FormData for everything.
        // User requested strict cURL match which uses -F (FormData).
        // So we should probably ALWAYS use FormData for consistency if possible, 
        // OR rely on `hasFile` but ensure `addRestaurant` and `updateRestaurant` logic calls `objectToFormData` correctly.
        return Object.values(obj).some(value => value instanceof File);
    };

    const addRestaurant = async (restaurant: Omit<Restaurant, 'id'>) => {
        try {
            if (user?.token) {
                // Always use FormData for consistency with user request if possible, or check hasFile
                // The prompt implies "supports uploading...". Let's force FormData if we want to match -F behavior strictly,
                // or just use the helper. 
                // Let's stick effectively to: if it has files -> FormData.
                // The user said: "You can update the images individually or together."
                // "Update fields including images." -> implies mixed content.
                
                // Let's try to ALWAYS prefer FormData for these endpoints to be safe if that's what the backend expects for -F
                const payload = objectToFormData(restaurant as Record<string, unknown>);
                
                const response = await api.post('/restaurants', payload, user.token);
                const newRest = response.data;
                setRestaurants((prev) => [...prev, newRest]);
                setStats(prev => prev ? { ...prev, totalRestaurants: prev.totalRestaurants + 1 } : null);
                
                toast.success('Restaurant added successfully');
                return newRest.id;
            } else {
                // Dev fallback
                const id = Math.random().toString(36).substr(2, 9);
                const newRestaurant = { ...restaurant, id };
                setRestaurants((prev) => [...prev, newRestaurant as Restaurant]);
                toast.success('Restaurant added successfully');
                return id;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to add restaurant');
        }
    };


    const updateRestaurant = async (id: string, updates: Partial<Restaurant>) => {
        try {
            if (user?.token) {
                // Always use objectToFormData to ensure we filter out empty passwords and existing image URLs
                const payload = objectToFormData(updates as Record<string, unknown>);
                
                const response = await api.put(`/restaurants/${id}`, payload, user.token);
                const updated = response.data;

                setRestaurants((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
                );
            } else {
                setRestaurants((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
                );
            }
            toast.success('Restaurant updated successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update restaurant');
        }
    };

    const deleteRestaurant = async (id: string) => {
        try {
            if (user?.token) {
                await api.delete(`/restaurants/${id}`, user.token);
            }
            setRestaurants((prev) => prev.filter((r) => r.id !== id));
            setStats(prev => prev ? { ...prev, totalRestaurants: Math.max(0, prev.totalRestaurants - 1) } : null);
            toast.success('Restaurant deleted successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete restaurant');
        }
    };

    const activateRestaurant = async (id: string) => {
        try {
            if (user?.token) {
                await api.patch(`/restaurants/${id}/activate`, {}, user.token);
                setRestaurants((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, isActive: true } : r))
                );
                toast.success('Restaurant activated successfully');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to activate restaurant');
        }
    };

    const deactivateRestaurant = async (id: string) => {
        try {
            if (user?.token) {
                await api.patch(`/restaurants/${id}/deactivate`, {}, user.token);
                setRestaurants((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, isActive: false } : r))
                );
                toast.success('Restaurant deactivated successfully');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to deactivate restaurant');
        }
    };

    const addScreen = async (screen: Omit<Screen, 'id'>) => {
        try {
            if (user?.token) {
                const response = await api.post('/screens', screen, user.token);
                const newScreen = response.data;
                setScreens((prev) => [...prev, newScreen]);
                setStats(prev => prev ? { ...prev, totalScreens: prev.totalScreens + 1 } : null);
                toast.success('Screen added successfully');
                return newScreen.id;
            } else {
                const id = Math.random().toString(36).substr(2, 9);
                const newScreen = { ...screen, id };
                setScreens((prev) => [...prev, newScreen as Screen]);
                toast.success('Screen added successfully');
                return id;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to add screen');
            return undefined;
        }
    };

    const updateScreen = async (id: string, updates: Partial<Screen>) => {
        try {
            if (user?.token) {
                const response = await api.put(`/screens/${id}`, updates, user.token);
                setScreens((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, ...response.data } : s))
                );
            } else {
                setScreens((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
                );
            }
            toast.success('Screen updated successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update screen');
        }
    };

    const deleteScreen = async (id: string) => {
        try {
            if (user?.token) {
                await api.delete(`/screens/${id}`, user.token);
            }
            setScreens((prev) => prev.filter((s) => s.id !== id));
            setStats(prev => prev ? { ...prev, totalScreens: Math.max(0, prev.totalScreens - 1) } : null);
            toast.success('Screen deleted successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete screen');
        }
    };

    const assignRestaurantToScreen = async (screenId: string, restaurantId: string, isVisibleOnScreen: boolean = true) => {
        try {
            if (user?.token) {
                await api.post(`/screens/${screenId}/assign-restaurant`, { restaurantId, isVisibleOnScreen }, user.token);
                toast.success('Restaurant assigned to screen');
                fetchScreens(); // Refresh to get updated list
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to assign restaurant');
        }
    };

    const unassignRestaurantFromScreen = async (screenId: string, restaurantId: string) => {
        try {
            if (user?.token) {
                await api.post(`/screens/${screenId}/unassign-restaurant`, { restaurantId }, user.token);
                toast.success('Restaurant unassigned from screen');
                fetchScreens();
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to unassign restaurant');
        }
    };

    return (
        <AdminContext.Provider
            value={{
                restaurants,
                screens,
                stats,
                isLoading,
                addRestaurant,
                updateRestaurant,
                deleteRestaurant,
                activateRestaurant,
                deactivateRestaurant,
                addScreen,
                updateScreen,
                deleteScreen,
                fetchScreens,
                assignRestaurantToScreen,
                unassignRestaurantFromScreen,
                entityStatuses,
                liveCalls,
                triggerRefresh,
            }}
        >
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
