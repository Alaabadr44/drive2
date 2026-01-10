import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useCall } from "@/contexts/CallContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, PhoneOff, Mic, LogOut, RefreshCw, Monitor, Zap, ZapOff, ShieldCheck, Volume2, AlertCircle } from "lucide-react";
import { AudioVisualizer } from "@/components/common/AudioVisualizer";
import { getAccessibleImageUrl } from "@/utils/imageUtils";
import { SOUNDS } from "@/constants/sounds";
import { api } from "@/services/api";
import { Screen } from "@/data/mockData";
import { toast } from "sonner";
import { BrandHeader } from "@/components/kiosk/BrandHeader";

const RestaurantDashboard = () => {
    const { user, logout, refreshProfile } = useAuth();
    const { socket, startRestaurantRetry, stopRestaurantRetry } = useSocket();
    const { language, isRTL } = useLanguage();
    const { 
        callState, 
        incomingCallData, 
        remoteStream, 
        acceptCall, 
        rejectCall, 
        endCall,
        isUploading
    } = useCall();

    const [assignedScreens, setAssignedScreens] = useState<(Screen & { isOnline?: boolean })[]>([]);
    const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
    const [hasAudioError, setHasAudioError] = useState(false);
    const pendingOnlineScreensRef = useRef<Set<string>>(new Set());
    const hasRefreshedRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // Mic Permission State
    const [micPermission, setMicPermission] = useState<PermissionState>('granted'); // Default to granted to avoid flicker if API not supported

    useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' as any }).then(p => {
                setMicPermission(p.state);
                p.onchange = () => {
                    console.log("Mic permission changed:", p.state);
                    setMicPermission(p.state);
                };
            }).catch(() => {
                console.warn("Permissions API not supported for microphone");
            });
        }
    }, []);

    const requestMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            setMicPermission('granted');
            toast.success("Microphone access granted");
        } catch (err) {
            console.error("Mic request denied:", err);
            setMicPermission('denied');
            toast.error("Microphone access denied. Please check browser settings.");
        }
    };
    
    // Ensure audio plays when remote stream is available
    useEffect(() => {
        if (audioRef.current && remoteStream && (callState === 'incall' || callState === 'ringing')) {
             // ... existing audio play logic ...
            console.log("RestaurantDashboard: Attaching remote stream to audio element");
            
            // Debug Remote Stream
            remoteStream.getAudioTracks().forEach(track => {
                // console.log(`[Audio Debug] Track ${track.id}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
                // Force enable just in case
                track.enabled = true;
            });
            
            audioRef.current.srcObject = remoteStream;
            audioRef.current.volume = 1.0;
            
            const tryPlay = async () => {
                try {
                    await audioRef.current?.play();
                    // console.log("[Audio Debug] Audio playback started successfully");
                    setHasAudioError(false);
                } catch (e) {
                    console.error("[Audio Debug] Error playing audio (Autoplay blocked?):", e);
                    setHasAudioError(true);
                }
            };
            tryPlay();
            
            // Interval to check if track goes mute unexpectedly
            const checkInterval = setInterval(() => {
                 remoteStream.getAudioTracks().forEach(track => {
                    if (track.muted || !track.enabled) {
                         // console.warn(`[Audio Debug] Track became unusable: muted=${track.muted}, enabled=${track.enabled}`);
                    }
                });
            }, 2000);
            
            return () => clearInterval(checkInterval);
        }
    }, [remoteStream, callState]);

    const [callDuration, setCallDuration] = useState(0);

    // Call Duration Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === 'incall') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [callState]);



    // One-time profile refresh on mount
    useEffect(() => {
        const refresh = async () => {
            if (!hasRefreshedRef.current && user?.token) {
                hasRefreshedRef.current = true;
                await refreshProfile();
            }
        };
        refresh();
    }, [user?.token, refreshProfile]);

    // Unified Socket and Status Management
    useEffect(() => {
        if (callState === 'idle') {
            setHasAudioError(false);
        }
    }, [callState]);

    useEffect(() => {
        const restaurantId = user?.restaurant?.id || user?.restaurantId;
        if (!socket || !restaurantId || !user?.token) return;

        const fetchScreens = async () => {
            try {
                const response = await api.get('/restaurants/my-screens', user.token);
                const screensData = response.data || response;
                const initialScreens = (Array.isArray(screensData) ? screensData : []).map((s: Screen) => ({
                    ...s,
                    isOnline: pendingOnlineScreensRef.current.has(s.id)
                }));
                setAssignedScreens(initialScreens);
                console.log('Screens fetched:', initialScreens.length);
            } catch (error) {
                console.error("Failed to fetch assigned screens:", error);
            }
        };

        const handleScreenOnline = (data: { screenId: string, screenName?: string }) => {
            console.log('Screen Online Event:', data);
            setAssignedScreens(prev => prev.map(s => s.id === data.screenId ? { ...s, isOnline: true } : s));
            toast.success(`Kiosk Connected`, {
                description: 'A kiosk is now ready.',
                duration: 2000,
            });
        };

        const handleScreenOffline = (data: { screenId: string }) => {
            console.log('Screen Offline Event:', data);
            setAssignedScreens(prev => prev.map(s => s.id === data.screenId ? { ...s, isOnline: false } : s));
        };

        const handleScreenAnnounce = (data: { screenId: string, screenName: string }) => {
            console.log('📣 RESTAURANT: Screen connected:', data.screenName);
            stopRestaurantRetry();
            setAssignedScreens(prev => {
                if (prev.length === 0) {
                    pendingOnlineScreensRef.current.add(data.screenId);
                    return prev;
                }
                const existing = prev.find(s => s.id === data.screenId);
                if (existing) {
                    if (!existing.isOnline) {
                        toast.success(`${data.screenName} is now Online`);
                    }
                    return prev.map(s => s.id === data.screenId ? { ...s, isOnline: true, name: data.screenName } : s);
                }
                return [...prev, { id: data.screenId, name: data.screenName, isOnline: true } as (Screen & { isOnline?: boolean })];
            });
        };

        // 1. Register Listeners FIRST
        socket.on('screen:online', handleScreenOnline);
        socket.on('screen:offline', handleScreenOffline);
        socket.on('screen:connected', handleScreenAnnounce);

        // 2. Fetch Initial Data
        fetchScreens();

        // 3. Emit Handshake and Join
        console.log('👑 Dashboard Handshake:', restaurantId);
        socket.emit('join:restaurant', restaurantId);
        socket.emit('restaurant:online', { restaurantId });
        socket.emit('request:screen:status', { restaurantId });
        startRestaurantRetry(restaurantId);

        return () => {
            socket.off('screen:online', handleScreenOnline);
            socket.off('screen:offline', handleScreenOffline);
            socket.off('screen:connected', handleScreenAnnounce);
            stopRestaurantRetry();
        };
    }, [socket, user?.token, user?.restaurant?.id, user?.restaurantId, startRestaurantRetry, stopRestaurantRetry]);



    const playTestSound = () => {
        const audio = new Audio(SOUNDS.RINGTONE);
        audio.volume = 1.0;
        audio.play().catch(err => {
            console.error("Test sound failed:", err);
            toast.error("Audio playback blocked. Please interact with the page.", {
                description: err.name
            });
            setHasAudioError(true);
        });
        
        toast.info("Playing test sound...", {
            icon: <Volume2 className="w-4 h-4" />
        });
    };

    const enableAudioManually = () => {
        if (audioRef.current) {
            audioRef.current.play()
                .then(() => {
                    setHasAudioError(false);
                    toast.success("Audio enabled successfully");
                })
                .catch(err => toast.error("Still unable to play audio"));
        }
        // Also play a dummy silent sound to unlock AudioContext generally if needed
        const silent = new Audio(SOUNDS.BUSY); // Use busy as dummy or generate silent buffer
        silent.volume = 0;
        silent.play().catch(() => {});
    };

    // Audio Playback removed as AudioVisualizer now handles it via WebAudio API

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const logoSrc = getAccessibleImageUrl(user?.restaurant?.logoUrl || (typeof user?.restaurant?.logo === 'string' ? user?.restaurant?.logo : null));

    return (
        <div className="h-screen w-screen bg-[#111111] flex flex-col overflow-hidden relative">
            
            {/* Background Effects - Removed to match KioskHome flat look */}
            {/* <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 pointer-events-none" /> */}

            {/* Top Bar - Header */}
            <div className="flex-none p-6 flex justify-between items-center z-20 border-b border-white/5 bg-[#111111]/50 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    {/* Brand Header - First Item */}
                    <div className="opacity-80 hover:opacity-100 transition-opacity">
                        <BrandHeader compact />
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-white/10 mx-2" />

                    {/* Restaurant Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-white/5">
                            {user?.restaurant?.logoUrl || user?.restaurant?.logo ? (
                                <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-white/50" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">
                                {user?.restaurant?.nameEn || user?.name}
                            </h1>
                            <p className="text-blue-400 text-sm">Online & Ready</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Mic Permission Indicator */}
                    {(micPermission === 'denied' || micPermission === 'prompt') && (
                        <Button 
                            variant={micPermission === 'denied' ? "destructive" : "secondary"}
                            size="sm"
                            className="mr-2 gap-2"
                            onClick={requestMic}
                        >
                            <Mic className="w-4 h-4" />
                            {micPermission === 'denied' ? 'Mic Blocked' : 'Enable Mic'}
                        </Button>
                    )}

                    {callState !== 'incall' && callState !== 'ringing' && (
                        <>
                            <Button 
                                variant="ghost" 
                                className="text-white/50 hover:text-white hover:bg-white/10 mr-2"
                                onClick={playTestSound}
                                title="Test Audio"
                            >
                                <Volume2 className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="text-white/50 hover:text-white hover:bg-white/10 mr-2"
                                onClick={() => {
                                    if (callState !== 'idle') endCall();
                                    setTimeout(() => window.location.reload(), 300);
                                }}
                                title="Reset & Refresh"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="text-white/50 hover:text-white hover:bg-white/10"
                                onClick={() => {
                                    if (callState !== 'idle' && callState !== 'ended') {
                                        endCall();
                                    }
                                    logout();
                                }}
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Container with Split Layout */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                
                {/* Left Panel: Call Interface (Flexible Width) */}
                <div className="flex-1 flex flex-col items-center justify-center relative p-6">
                    
                    {/* STATE: IDLE */}
                    {callState === 'idle' && (
                        <div className="flex flex-col items-center text-center animate-in fade-in duration-700 max-w-lg">
                            <div className="w-40 h-40 rounded-full bg-blue-500/5 border border-blue-500/10 flex items-center justify-center mb-8 relative group">
                                <div className="absolute inset-0 rounded-full animate-ping-slow bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                <Phone className="w-16 h-16 text-blue-500/50 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <h2 className="text-3xl font-light text-white mb-4">Waiting for Calls</h2>
                            <p className="text-white/40 text-lg">
                                Your kiosk screens are connected and ready. Calls will appear here instantly.
                            </p>
                        </div>
                    )}

                    {/* STATE: RINGING */}
                    {callState === 'ringing' && incomingCallData && (
                        <div className="flex flex-col items-center text-center w-full max-w-2xl animate-in zoom-in-95 duration-300">
                             <div className="flex flex-col items-center justify-center mb-12">
                                <div className="w-32 h-32 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(234,179,8,0.3)] mb-6">
                                    <Phone className="w-12 h-12 text-white" />
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-2">{incomingCallData.screenName || "Incoming Call"}</h2>
                                <p className="text-yellow-400 font-medium text-xl animate-pulse">Incoming Call...</p>
                             </div>

                             <div className="flex gap-12 w-full justify-center">
                                 <Button 
                                    onClick={rejectCall}
                                    size="lg" 
                                    className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 border-4 border-slate-900 shadow-xl transition-transform hover:scale-110"
                                >
                                    <PhoneOff className="w-8 h-8" />
                                 </Button>
                                 <Button 
                                    onClick={acceptCall}
                                    size="lg" 
                                    className="h-24 w-24 rounded-full bg-green-500 hover:bg-green-600 border-4 border-slate-900 shadow-xl animate-pulse transition-transform hover:scale-110"
                                >
                                    <Phone className="w-10 h-10" />
                                 </Button>
                             </div>
                        </div>
                    )}

                    {/* STATE: IN CALL (CONNECTED) */}
                    {callState === 'incall' && (
                        <div className="flex flex-col items-center text-center w-full max-w-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
                            <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-8 w-full border border-white/5 shadow-2xl">
                                <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                        <div className="text-left">
                                            <h3 className="text-3xl font-bold text-white">
                                                {incomingCallData?.screenName || "Connected Kiosk"}
                                            </h3>
                                            <p className="text-green-400 text-base font-medium mt-1">Connected • {formatDuration(callDuration)}</p>
                                        </div>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <Mic className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                
                                {/* Visualizer Area */}
                                <div className="bg-black/30 rounded-2xl h-64 mb-8 flex items-center justify-center relative overflow-hidden border border-white/5">
                                    {remoteStream ? (
                                        <AudioVisualizer 
                                            stream={remoteStream} 
                                            width={500} 
                                            height={200} 
                                            barColor="#60a5fa" 
                                        />
                                    ) : (
                                        <div className="flex gap-2 items-center">
                                            <div className="w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center">
                                    <Button 
                                        onClick={endCall}
                                        className="w-full max-w-md h-16 text-xl font-semibold bg-red-500 hover:bg-red-600 rounded-2xl gap-3 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]"
                                    >
                                        <PhoneOff className="w-6 h-6" />
                                        End Call
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Audio Error Fallback Overlay */}
                    {hasAudioError && (callState === 'incall' || callState === 'ringing') && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-2xl flex flex-col items-center max-w-md text-center">
                                <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
                                <h3 className="text-2xl font-bold text-white mb-2">Audio Playback Blocked</h3>
                                <p className="text-white/70 mb-6">The browser blocked the audio. Please click below to enable sound for this call.</p>
                                <Button 
                                    onClick={enableAudioManually}
                                    size="lg"
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold w-full"
                                >
                                    <Volume2 className="w-5 h-5 mr-2" />
                                    ENABLE AUDIO
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Persistent Screen List (Fixed Width) */}
                <div className="w-96 bg-[#111111] border-l border-white/5 flex flex-col z-20 shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-[#111111]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-400" />
                                Kiosk Status
                            </h2>
                            <span className="flex items-center gap-2 text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/20 font-medium">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Live Monitor
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {assignedScreens.length === 0 ? (
                            <div className="text-center py-20 text-white/20 flex flex-col items-center">
                                <Monitor className="w-16 h-16 mb-4 opacity-10" />
                                <p className="font-medium">No assigned screens</p>
                                <p className="text-sm mt-1 opacity-60">Screens will appear here when assigned</p>
                            </div>
                        ) : (
                            assignedScreens.map(screen => (
                                <div 
                                    key={screen.id} 
                                    className={`relative group rounded-xl p-4 border transition-all duration-300 ${
                                        screen.isOnline 
                                        ? 'bg-gradient-to-r from-green-500/10 to-transparent border-green-500/20 hover:border-green-500/30' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`flex-none w-3 h-3 rounded-full ${
                                                screen.isOnline 
                                                ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' 
                                                : 'bg-red-500/50'
                                            }`} />
                                            <span className={`font-semibold truncate ${screen.isOnline ? 'text-white' : 'text-white/50'}`}>
                                                {screen.name || `Screen ${screen.id.slice(0,4)}`}
                                            </span>
                                        </div>
                                        {screen.isOnline ? (
                                            <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
                                        ) : (
                                            <ZapOff className="w-4 h-4 text-white/20" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
                                        <span className={`flex items-center gap-1.5 ${screen.isOnline ? 'text-green-400' : 'text-red-400/70'}`}>
                                            {screen.isOnline ? (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    Active
                                                </>
                                            ) : (
                                                'Offline'
                                            )}
                                        </span>
                                        <span className="text-white/20 font-mono">ID: {screen.id.slice(0, 4)}</span>
                                    </div>
                                    
                                    {/* Hover Status Bar */}
                                    <div className={`absolute bottom-0 left-0 h-1 rounded-full transition-all duration-500 ${
                                        screen.isOnline ? 'w-full bg-green-500/30' : 'w-0 bg-red-500/0'
                                    }`} />
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 text-center bg-[#111111]">
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">System Operational</p>
                    </div>
                </div>
            </div>
            {/* Hidden Audio Element for Call Playback */}
            <audio ref={audioRef} autoPlay playsInline controls={false} />

            {/* BLOCKING UPLOAD OVERLAY */}
            {isUploading && (
                <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Ending Call...</h2>
                        <p className="text-white/50 text-lg animate-pulse">Uploading call recording</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantDashboard;
