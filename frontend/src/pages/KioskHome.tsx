import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/contexts/CallContext';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { RestaurantCard } from '@/components/kiosk/RestaurantCard';
import { Restaurant } from '@/data/mockData';
import { RestaurantDetail } from './RestaurantDetail';
import { api } from '@/services/api';
import { getAccessibleImageUrl } from '@/utils/imageUtils';
import { LogOut } from 'lucide-react';
import { BrandHeader } from '@/components/kiosk/BrandHeader';
import { SocketEventTracker } from '@/components/debug/SocketEventTracker';
import { config } from '@/config';
import { SOUNDS } from '@/constants/sounds';


export default function KioskHome() {
  const { isRTL } = useLanguage();
  const { user, logout, refreshProfile } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { socket, isConnected } = useSocket();
  const pendingOnlineRestaurantsRef = useRef<Set<string>>(new Set());
  const hasRefreshedRef = useRef(false);
  const { remoteStream, callState } = useCall();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Ensure audio plays when remote stream is available
  useEffect(() => {
    if (audioRef.current && remoteStream && (callState === 'incall' || callState === 'ringing')) {
        console.log("KioskHome: Attaching remote stream to audio element");
        audioRef.current.srcObject = remoteStream;
        // Enforce maximum volume
        audioRef.current.volume = 1.0;
        // Attempt to unmute if somehow muted
        audioRef.current.muted = false;
        
        const playAudio = async () => {
            try {
                await audioRef.current?.play();
                console.log("Audio playing at max volume");
            } catch (e) {
                console.error("Error playing audio:", e);
                // Retry once with interaction if needed? (Usually verified by click)
            }
        };
        playAudio();
    }
  }, [remoteStream, callState]);

  useEffect(() => {
    const refresh = async () => {
      if (!hasRefreshedRef.current && user?.token) {
        hasRefreshedRef.current = true;
        await refreshProfile();
      }
    };
    refresh();
  }, [user?.token, refreshProfile]);

  // Disable Right Click (Context Menu) for Kiosk
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Request microphone permission on mount
  // Request microphone permission on mount and manage state
  const [micPermission, setMicPermission] = useState<PermissionState>('granted'); 

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' as any }).then(p => {
            setMicPermission(p.state);
            p.onchange = () => setMicPermission(p.state);
        });
    }

    const requestMicPermission = async () => {
      // Only auto-request if we are a screen
      if (user?.role === 'SCREEN') {
        try {
          console.log('🎤 Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('✅ Microphone permission granted');
          stream.getTracks().forEach(track => track.stop());
          setMicPermission('granted');
        } catch (error) {
          console.error('❌ Microphone permission denied:', error);
          setMicPermission('denied');
        }
      }
    };
    
    // Small delay to ensure page interaction or load
    const timer = setTimeout(() => {
        requestMicPermission();
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.role]);

  const requestMicManual = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          setMicPermission('granted');
          toast.success("Microphone access enabled");
      } catch (e) {
          toast.error("Microphone access denied");
          setMicPermission('denied');
      }
  };

  // Sound Permission Logic
  const [soundPermission, setSoundPermission] = useState<PermissionState>('prompt');

  useEffect(() => {
    // Try to play a silent sound to check autoplay
    const checkAudio = async () => {
         try {
             const audio = new Audio(SOUNDS.BUSY || ''); // Minimal sound fallbacks
             audio.volume = 0;
             await audio.play();
             setSoundPermission('granted');
         } catch (e) {
             console.warn("Autoplay blocked, user interaction required");
             setSoundPermission('denied'); // or 'prompt'
         }
    };
    checkAudio();
  }, []);

  const enableSound = async () => {
      try {
          // You might need to import SOUNDS if not already
          const audio = new Audio(SOUNDS.BUSY);
          audio.volume = 0;
          await audio.play();
          setSoundPermission('granted');
          toast.success("Sound enabled");
      } catch (e) {
          toast.error("Could not enable sound. Please click again.");
      }
  };

  useEffect(() => {
    const fetchMyRestaurants = async () => {
      if (user?.role === 'SCREEN' && user.token) {
        setIsLoading(true);
        try {
          const response = await api.get('/screens/my-restaurants', user.token);
          // Force initial state to closed as requested
          const initialRestaurants = (response.data || []).map((r: Restaurant) => {
            // Check if this restaurant had a pending online event
            const shouldBeOnline = pendingOnlineRestaurantsRef.current.has(r.id);
            return {
              ...r,
              status: shouldBeOnline ? ('available' as const) : ('closed' as const)
            };
          });
          setRestaurants(initialRestaurants);
          console.log('Restaurants fetched and status applied:', initialRestaurants.map(r => ({ id: r.id, name: r.nameEn, status: r.status })));
          
          // Send screen:connected for all restaurants that were marked as online
          if (socket && user?.role === 'SCREEN') {
            const screenId = user.screenId || user.screen?.id || user.id;
            initialRestaurants.forEach(restaurant => {
              if (restaurant.status === 'available') {
                console.log('📣 SCREEN: Confirming connection to buffered online restaurant:', restaurant.id);
                socket.emit('screen:connected', {
                  screenId,
                  screenName: user.name || user.screen?.name || `Screen ${screenId.slice(0, 4)}`,
                  restaurantId: restaurant.id
                });
              }
            });
          }
          // Trigger status request after fetching restaurants to ensure we didn't miss any online events
          if (socket) {
            console.log('📣 SCREEN: Requesting status sync after fetch');
            socket.emit('request:restaurant:status', { screenId: user.screenId || user.screen?.id || user.id });
          }
        } catch (error) {
          console.error('Failed to fetch screen restaurants:', error);
          setRestaurants([]); 
        } finally {
          setIsLoading(false);
          // Only clear if we actually had something to avoid unnecessary work
          if (pendingOnlineRestaurantsRef.current.size > 0) {
            console.log('Clearing buffered restaurants after fetch');
            pendingOnlineRestaurantsRef.current.clear();
          }
        }
      } else {
        setRestaurants([]);
        setIsLoading(false);
      }
    };

    fetchMyRestaurants();
  }, [user, socket]);

  useEffect(() => {
    if (!socket) return;

    // Listen for online events
    const handleOnline = (data: { restaurantId: string }) => {
      console.log('KioskHome: Restaurant online event received:', data);
      
      const updateStatus = (r: Restaurant) => r.id === data.restaurantId ? { ...r, status: 'available' as const } : r;
      
      setRestaurants(prev => {
        const restaurant = prev.find(r => r.id === data.restaurantId);
        if (restaurant) {
          console.log('Found restaurant, updating status to available:', restaurant.nameEn);
          
          // Handshake: Confirm screen connection to the restaurant that just came online
          if (user?.role === 'SCREEN') {
            const screenId = user.screenId || user.screen?.id || user.id;
            console.log('📣 SCREEN: Confirming connection to restaurant:', data.restaurantId);
            socket.emit('screen:connected', {
                screenId,
                screenName: user.name || user.screen?.name || `Screen ${screenId.slice(0, 4)}`,
                restaurantId: data.restaurantId
            });
          }
        } else {
          console.log('⚠️ Restaurant not found in list (buffering for later):', data.restaurantId);
          // Restaurant not loaded yet, add to pending set
          pendingOnlineRestaurantsRef.current.add(data.restaurantId);
        }
        const updated = prev.map(updateStatus);
        console.log('Updated restaurants:', updated.map(r => ({ id: r.id, name: r.nameEn, status: r.status })));
        return updated;
      });

      setSelectedRestaurant(prev => prev ? updateStatus(prev) : null);
    };

    // Listen for offline events
    const handleOffline = (data: { restaurantId: string }) => {
      console.log('KioskHome: Restaurant offline event received:', data);
      
      const updateStatus = (r: Restaurant) => r.id === data.restaurantId ? { ...r, status: 'closed' as const } : r;

      setRestaurants(prev => {
        const restaurant = prev.find(r => r.id === data.restaurantId);
        if (restaurant) {
             // Silence toast
        }
        return prev.map(updateStatus);
      });

      setSelectedRestaurant(prev => prev ? updateStatus(prev) : null);
    };

    socket.on('restaurant:online', handleOnline);
    socket.on('restaurant:offline', handleOffline);

    // Handle connection and re-connection
    const handleConnect = () => {
      // Join the screen's room if logged in as a screen
      if (user?.role === 'SCREEN') {
        const screenId = user.screenId || user.screen?.id || user.id;
        console.log('🟢 FRONTEND: Attempting to join screen room:', screenId);
        socket.emit('join:screen', screenId);
        
        // Attempt to request status sync (speculative fix for refresh issue)
        socket.emit('request:restaurant:status', { screenId });
      }
    };

    // Handle disconnect
    const handleDisconnect = () => {
      console.log('socket disconnected, resetting restaurants to closed');
      setRestaurants(prev => prev.map(r => ({ ...r, status: 'closed' as const })));
      setSelectedRestaurant(prev => prev ? { ...prev, status: 'closed' as const } : null);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Initial check in case socket is already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      console.log('Cleaning up KioskHome socket listeners');
      socket.off('restaurant:online', handleOnline);
      socket.off('restaurant:offline', handleOffline);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, user?.id, user?.role, user?.screen?.id, user?.screenId, user?.name, user?.screen?.name]);

  // Landing View State (Default to true)
  const [showLanding, setShowLanding] = useState(true);

  // Inactivity Timer for Grid View
  useEffect(() => {
    // Only run if we are NOT on the landing page and NOT viewing a restaurant detail
    // (RestaurantDetail has its own timer, but this covers the grid view itself)
    if (showLanding || selectedRestaurant) return;

    const TIMEOUT = 60000; // 60 seconds
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            console.log("Grid inactivity timeout - returning to landing");
            setShowLanding(true);
        }, TIMEOUT);
    };

    // Initial start
    resetTimer();

    // Listeners
    const events = ['touchstart', 'click', 'scroll', 'mousemove', 'keypress'];
    events.forEach(e => document.addEventListener(e, resetTimer));

    return () => {
        clearTimeout(timer);
        events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [showLanding, selectedRestaurant]);

  if (selectedRestaurant) {
    return (
      <RestaurantDetail
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
        onReset={() => {
            setSelectedRestaurant(null);
            setShowLanding(true);
        }}
      />
    );
  }

  // If role is SCREEN, show only the logo grid
  if (user?.role === 'SCREEN') {

    // LANDING PAGE VIEW
    if (showLanding) {
        return (
            <div 
                className="min-h-screen bg-[#111111] kiosk-mode flex flex-col relative overflow-hidden cursor-pointer"
                onClick={() => setShowLanding(false)}
            >
                {/* Background Pattern/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-0" />
                
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 gap-16 pt-24">
                    {/* Big Brand Header */}
                    <div className="animate-in zoom-in duration-700 flex flex-col items-center gap-4">
                        <BrandHeader 
                            size="4xl" 
                            logoUrl={(user as any)?.logoUrl || (user as any)?.logo}
                        />
                        {(micPermission === 'denied' || micPermission === 'prompt') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); requestMicManual(); }}
                                className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-red-500/30 transition-colors z-50"
                            >
                                ⚠️ Enable Microphone to Order
                            </button>
                        )}
                        {(soundPermission === 'denied' || soundPermission === 'prompt') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); enableSound(); }}
                                className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-red-500/30 transition-colors z-50 mt-2"
                            >
                                🔊 Enable Sound to Order
                            </button>
                        )}
                    </div>

                    {/* Order Now Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowLanding(false);
                        }}
                        className="mt-20 group relative px-20 py-10 bg-red-600 rounded-full shadow-[0_0_60px_-15px_rgba(220,38,38,0.5)] hover:shadow-[0_0_80px_-10px_rgba(220,38,38,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300"
                    >
                        <div className="flex items-center gap-6">
                            <span className="text-5xl md:text-7xl font-black text-white tracking-wider uppercase">
                                {isRTL ? 'اطلب الآن' : 'ORDER NOW'}
                            </span>
                        </div>
                        
                        <span className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20"></span>
                    </button>
                    
                    {/* 
                    <p className="text-white/40 text-xl font-medium tracking-widest animate-pulse delay-700">
                        {isRTL ? 'اضغط للبدء' : 'TAP TO START'}
                    </p>
                    */}
                </div>

                {/* Hidden Audio Element for Call Playback */}
                <audio ref={audioRef} autoPlay playsInline controls={false} />
            </div>
        );
    }
    
    // RESTAURANT SELECTION GRID
    return (
      <>
      <div className="min-h-screen bg-[#111111] kiosk-mode overflow-x-hidden flex flex-col items-center justify-center relative">
        <BrandHeader 
            className="pt-12 pb-4" 
            size="3xl"
            logoUrl={(user as any)?.logoUrl || (user as any)?.logo}
            showTitle={true}
        />
        
        {/* Back Button to Landing - Removed per request */}
        {/* 
        <button 
           onClick={() => setShowLanding(true)}
           className="absolute top-8 left-8 z-[20] flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
           <span className="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        */}
        
        {/* Screen Name Badge - Hidden per request */}
        {/*
        <div className="absolute top-6 right-8 z-[20] flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Kiosk ID</span>
            <span className="text-sm font-semibold text-white/90">{user?.name || user?.screen?.name || user?.id?.slice(0, 8)}</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-white">{(user?.name || user?.screen?.name || 'K').charAt(0).toUpperCase()}</span>
          </div>
        </div>
        */}
        
        {/* Hidden Developer Logout - Bottom Left */}
        {config.enableDebugTools && (
          <button 
            onClick={logout}
            className="fixed bottom-4 left-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white/20 hover:text-white flex items-center justify-center rounded-full z-[100] transition-all"
            title="Dev Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
        
        <main className="px-8 md:px-14 pb-24 pt-12 w-full max-w-7xl">
          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh]">
              <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary"></div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[40vh] text-center">
              <p className="text-xl text-muted-foreground mb-4">No restaurants assigned to this screen</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 md:gap-10 max-w-none mx-auto justify-items-center">
              {restaurants.map((restaurant, index) => {
                // Dynamic background based on status
                // User requested to remove white background color for open, but keep white for closed.
                const currentTileStyle = restaurant.status === 'closed' ? "bg-white" : "bg-transparent";
                const isDarkText = true;

                return (
                  <button
                    key={restaurant.id}
                    onClick={() => {
                      if (restaurant.status !== 'closed') {
                        setSelectedRestaurant(restaurant);
                      }
                    }}
                    disabled={restaurant.status === 'closed'}
                    // Changed aspect-square to h-[260px] w-full (fixed height) as requested "fit spacfic fixed size".
                    // Removed shadows for cleaner transparent look.
                    className={`group relative w-full h-[260px] flex flex-col items-center justify-center rounded-3xl overflow-hidden transition-all duration-500 animate-fade-in ${currentTileStyle} ${restaurant.status === 'closed' ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      {restaurant.logoUrl || restaurant.logo ? (
                        <img
                          src={getAccessibleImageUrl(restaurant.logoUrl || (typeof restaurant.logo === 'string' ? restaurant.logo : ''))}
                          alt={restaurant.nameEn}
                          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      
                      {/* Name hidden for logo-only design
                      <h3 className={`text-xl md:text-3xl font-black tracking-tight leading-tight ${isDarkText ? 'text-black' : 'text-white'}`}>
                        {isRTL ? restaurant.nameAr : restaurant.nameEn}
                      </h3>
                      */}
                    </div>

                    {(restaurant.status === 'available' || restaurant.status === 'AVAILABLE') && isConnected && (
                      <div className="absolute top-6 right-6 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                      </div>
                    )}
                    


                    {restaurant.status === 'closed' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-grayscale">
                        <span className="px-6 py-2 bg-white/90 text-black font-bold rounded-full text-lg shadow-lg">
                          {isRTL ? 'مغلق' : 'CLOSED'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
      {config.enableDebugTools && <SocketEventTracker />}
      {/* Hidden Audio Element for Call Playback */}
      <audio ref={audioRef} autoPlay playsInline controls={false} />
      </>
    );
  }

  // Default view (for non-screen users or not logged in)
  return (
    <div className="min-h-screen bg-background kiosk-mode">
      <KioskHeader />
      
      <main className="p-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {restaurants.map((restaurant, index) => (
            <div
              key={restaurant.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <RestaurantCard
                restaurant={restaurant}
                onClick={() => setSelectedRestaurant(restaurant)}
              />
            </div>
          ))}
        </div>
      </main>
      {config.enableDebugTools && <SocketEventTracker />}
      {/* Hidden Audio Element (though less critical here, maybe) */}
      <audio ref={audioRef} autoPlay playsInline controls={false} />
    </div>
  );
}
