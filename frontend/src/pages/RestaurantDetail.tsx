import { useLanguage } from '@/contexts/LanguageContext';
import { useCall } from '@/contexts/CallContext';
import { MenuImageViewer } from '@/components/kiosk/MenuImageViewer';
import { Restaurant } from '@/data/mockData';
import { api } from '@/services/api'; // Import API
import { getAccessibleImageUrl } from '@/utils/imageUtils';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, ArrowLeft, Phone, PhoneOff, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BrandHeader } from '@/components/kiosk/BrandHeader';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
  onReset: () => void;
}

export function RestaurantDetail({ restaurant, onBack, onReset }: RestaurantDetailProps) {
  const { isRTL } = useLanguage();
  const { callState, initiateCall, endCall, queuePosition } = useCall();
  const [scale, setScale] = useState(1);
  const callInProgressRef = useRef(false);

  // Inactivity Timer Logic
  const TIMEOUT_DURATION_SEC = 60; // 60 seconds
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_DURATION_SEC);

  useEffect(() => {
    // If a call is active (incall, ringing, calling, busy), do not run the timer
    const isCallActive = callState === 'calling' || callState === 'ringing' || callState === 'incall' || callState === 'busy';
    
    if (isCallActive) return;

    // Timer Interval
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          console.log("Inactivity timeout reached, returning to landing page.");
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetTimer = () => {
      setTimeLeft(TIMEOUT_DURATION_SEC);
    };

    // Event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      clearInterval(timerInterval);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [callState, onReset]);

  // Automatically go back when call ends
  useEffect(() => {
    // Reset call progress flag if we are idle and NOT coming from a call (initial mount or reset)
    if (callState === 'idle' && !callInProgressRef.current) {
        return;
    }

    // Mark call as in progress if we enter any non-idle state
    if (callState === 'calling' || callState === 'ringing' || callState === 'incall' || callState === 'busy' || callState === 'thankyou' || callState === 'queued') {
      callInProgressRef.current = true;
    } 
    
    // If we had a call in progress and we returned to idle, go back to landing
    if (callInProgressRef.current && callState === 'idle') {
      // Small delay to allow thank you screen or busy toast/state to be seen if needed, 
      // though typically handled by state transitions.
      console.log("Call ended (was active), resetting to home.");
      callInProgressRef.current = false; // Reset ref
      onReset();
    }
  }, [callState, onReset]);

  
  // Carousel logic (multiple menu images)
  const menuImages = useMemo(() => {
    // 1. Try the new multiple menus relationship (handle both string[] and object[])
    if (restaurant.menus && Array.isArray(restaurant.menus) && restaurant.menus.length > 0) {
      return restaurant.menus.map(m => {
        const url = typeof m === 'string' ? m : (m as { imageUrl?: string; url?: string }).imageUrl || (m as { imageUrl?: string; url?: string }).url;
        return url ? getAccessibleImageUrl(url) : null;
      }).filter((url): url is string => !!url);
    }
    
    // 2. Fallback to legacy single image fields
    const legacyUrl = restaurant.menuImageUrl || restaurant.menuImage;
    if (legacyUrl) {
      return [getAccessibleImageUrl(legacyUrl as string)];
    }
    
    return [];
  }, [restaurant]);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  const name = isRTL ? restaurant.nameAr : restaurant.nameEn;

  // UI state: hide menu only when actually calling/ringing/incall/busy
  const isCalling = callState === 'calling' || callState === 'ringing' || callState === 'incall' || callState === 'busy' || callState === 'queued';

  // Call Timer Logic
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callState === 'incall') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResetLine = async () => {
      try {
          await api.post(`/restaurants/${restaurant.id}/reset`, {});
          // We can assume the socket will update, or we can force idle locally
          // ideally the backend emits a status update. 
          // For now, let's just log and maybe show a visual cue.
          console.log("Line reset requested");
      } catch (e) {
          console.error("Failed to reset line", e);
      }
  };

  return (
    <div className="h-screen w-full bg-[#111111] kiosk-mode flex flex-col overflow-hidden relative">
      <BrandHeader 
          className="pt-6 relative w-full z-10 shrink-0" 
          size="2xl" 
          compact={false}
      />
      
      {/* Centered Menu Viewer Section - Takes remaining space */}
      <div className="flex-1 relative w-full min-h-0 overflow-hidden flex flex-col">
        {/* Inner container for centering/padding */}
        <div className="w-full h-full flex items-center justify-center p-4">
           {/* The actual viewer area - constrained by parent flex-1 */}
           <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
          
          {/* Navigation Arrows */}


          <div className="w-full h-full relative overflow-hidden rounded-3xl shadow-2xl border border-white/5 group">
            {menuImages.length > 0 ? (
               <div 
                  id="menu-carousel"
                  className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x"
                  style={{ scrollBehavior: 'smooth' }}
                  onScroll={(e) => {
                     const el = e.currentTarget;
                     const newIndex = Math.round(el.scrollLeft / el.clientWidth);
                     if (newIndex !== currentIndex) setCurrentIndex(newIndex);
                  }}
               >
                 {menuImages.map((img, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center bg-black/50">
                       <MenuImageViewer 
                          menuImage={img} 
                          restaurantName={name}
                          scale={scale}
                       />
                    </div>
                 ))}
               </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/20 bg-white/5 min-h-[600px]">
                 <p className="text-xl font-medium">No Menu Image Available</p>
              </div>
            )}
            
            {menuImages.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all backdrop-blur-sm"
                    onClick={() => {
                        const el = document.getElementById('menu-carousel');
                        if (el) el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
                    }}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>

                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all backdrop-blur-sm"
                    onClick={() => {
                        const el = document.getElementById('menu-carousel');
                        if (el) el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
                    }}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>

                  {/* Page Indicator Pill */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 z-20 pointer-events-none">
                     <span className="text-white font-bold text-xl tracking-widest leading-none">
                       {currentIndex + 1} / {menuImages.length}
                     </span>
                  </div>
                </>
             )}
          </div>




        </div>
       </div>
      </div>

      {/* Dynamic Bottom Action Bar - Now Relative/Flex Item (Static at bottom) */}
      <div className="w-full shrink-0 bg-black/40 backdrop-blur-3xl border-t border-white/10 pb-12 pt-8 z-50">
        <div className="max-w-4xl mx-auto px-12">
          {!isCalling ? (
            /* IDLE STATE */
            <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-500">
               <div className="w-full flex items-center justify-center relative gap-8">
                  {/* Back Arrow (Left-ish) */}
                  <button 
                    onClick={onBack}
                    className="absolute left-0 w-32 h-32 flex items-center justify-center text-white/70 hover:text-white transition-colors active:scale-90"
                  >
                    <ArrowLeft className={cn("w-16 h-16", isRTL && "rotate-180")} />
                  </button>

                  {/* Prev Arrow - Moved to image */}
                  
                  {/* Main Call Button (Center) */}
                  <button 
                    onClick={() => initiateCall(restaurant)}
                    className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-black shadow-2xl shadow-white/10 hover:scale-105 transition-transform active:scale-95 relative z-10"
                  >
                    <Phone className="w-10 h-10 fill-current" />
                  </button>

                  {/* Next Arrow - Moved to image */}
               </div>
               
               <div className="text-center space-y-2">
                  <p className="text-white text-2xl font-bold tracking-tight">
                    {isRTL ? 'اطلب الآن واتصل' : 'Choose your Order and Call Now'}
                  </p>

                  {timeLeft <= 30 && (
                    <p className={`text-sm font-medium ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white/50'}`}>
                        Auto-return in {timeLeft}s
                    </p>
                  )}
               </div>
            </div>
          ) : (
            /* CALLING / IN-CALL STATE */
            <div className="flex items-center justify-between w-full animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white">
                  <img 
                    src={getAccessibleImageUrl(restaurant.logoUrl || restaurant.logo)} 
                    alt={name} 
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div>
                  <h3 className="text-white text-3xl font-black">{name}</h3>
                  <p className="text-white/50 text-xl">{isRTL ? 'طاقم العمل' : 'Staff'}</p>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-white text-3xl font-bold animate-pulse">
                    {callState === 'calling' && (isRTL ? 'جاري الاتصال...' : 'Calling ...')}
                    {callState === 'ringing' && (isRTL ? 'يرن...' : 'Ringing ...')}
                    {callState === 'busy' && (isRTL ? 'خط مشغول' : 'Line Busy')}
                    {callState === 'queued' && (
                        <span className="text-amber-400">
                             {isRTL ? 'في الانتظار...' : 'Waiting in Queue...'}
                        </span>
                    )}
                  </p>

                  {callState === 'queued' && (
                      <div className="flex flex-col items-end gap-1 animate-in slide-in-from-right duration-700 mt-2">
                           <div className="flex items-center gap-2 text-white/80">
                               <Users className="w-6 h-6" />
                               <span className="text-2xl font-bold">
                                   {isRTL ? `دورك: ${queuePosition}` : `Position: ${queuePosition}`}
                               </span>
                           </div>
                           <p className="text-sm text-white/50">
                               {isRTL ? 'يرجى الانتظار، سيتم توصيلك تلقائياً.' : 'Please wait, you will be connected automatically.'}
                           </p>
                      </div>
                  )}

                  {callState === 'incall' && (
                    <div className="flex flex-col items-end gap-1 animate-in slide-in-from-right duration-700">
                        <span className="text-white text-3xl font-bold">{isRTL ? 'متصل' : 'Connected'}</span>
                        <span className="text-green-400 font-mono text-2xl">{formatDuration(callDuration)}</span>
                    </div>
                  )}
                </div>
                
                {/* Call Action Button */}
                {callState === 'incall' ? (
                   // End Call Button (Red, static or slight pulse)
                   <button 
                      onClick={endCall}
                      className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center text-white shadow-2xl shadow-red-600/50 active:scale-95 transition-all animate-in slide-in-from-right duration-1000"
                    >
                      <PhoneOff className="w-16 h-16" />
                   </button>
                ) : (
                   // Ringing/Calling Button (Vibrating)
                   // User requested: "when restrunt accept makee it in red color and move in animetion in almoset end of screen width"
                   // This means the TRANSITION from this state to the connected state involves the move.
                   // Here we just vibrate for calling/ringing
                   <button 
                      onClick={endCall}
                      className={cn(
                        "w-32 h-32 rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition-transform active:scale-95 relative z-10",
                        callState === 'busy' ? "bg-amber-400" : (callState === 'queued' ? "bg-amber-400 animate-pulse" : "bg-white animate-vibrate")
                      )}
                    >
                      {/* Using Phone icon here still until it connects? standard UI usually shows Hangup option though. 
                          But user focus was on "call icon". Keeping PhoneOff for logic, but styling as requested? 
                          Wait, lines 236-241 in original code was the 'else' block of !isCalling.
                          This block is INSIDE the (isCalling) block.
                          So this button is normally the hangup button.
                      */}
                       {callState === 'busy' || callState === 'queued' ? <PhoneOff className="w-16 h-16 text-black" /> : <PhoneOff className="w-16 h-16 text-red-600" />}
                   </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
