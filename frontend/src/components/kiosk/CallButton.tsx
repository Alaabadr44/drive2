import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCall } from '@/contexts/CallContext';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Restaurant } from '@/data/mockData';

interface CallButtonProps {
  restaurant: Restaurant;
  onCallEnd?: () => void;
}

export function CallButton({ restaurant, onCallEnd }: CallButtonProps) {
  const { t, isRTL } = useLanguage();
  const { initiateCall, endCall, callState } = useCall();
  const [duration, setDuration] = useState(0);

  const restaurantName = isRTL ? restaurant.nameAr : restaurant.nameEn;
  const status = restaurant.status;

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'incall') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
        setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    if (status === 'busy' || status === 'closed') return;
    if (status !== 'available' && status !== 'AVAILABLE') return;
    
    initiateCall(restaurant);
  };

  const handleEndCall = () => {
    endCall();
    onCallEnd?.();
  };

  if (status === 'closed') {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-100 rounded-2xl border border-gray-200 opacity-80 cursor-not-allowed w-full">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
          <PhoneOff className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-500 uppercase tracking-wider">
            {isRTL ? 'مغلق حالياً' : 'Currently Closed'}
          </p>
          <p className="text-sm text-muted-foreground">{restaurantName}</p>
        </div>
      </div>
    );
  }

  if (status === 'busy') {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-red-100 rounded-2xl border border-red-200 w-full">
        <div className="w-16 h-16 rounded-full bg-red-200 flex items-center justify-center">
          <PhoneOff className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-red-600">{t('busy')}</p>
          <p className="text-sm text-muted-foreground">{restaurantName}</p>
        </div>
      </div>
    );
  }

  // Active Call State (handled globally mostly, but reflect here)
  if (callState === 'calling' || callState === 'ringing') {
     // If we are calling, show loader
     return (
        <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-2xl border border-blue-200 w-full animate-pulse">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-blue-600">{t('calling')}</p>
            </div>
        </div>
     );
  }

  if (callState === 'incall') {
      return (
        <div className="flex flex-col items-center gap-4 p-6 bg-green-50 rounded-2xl border border-green-200 w-full">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
              <Phone className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-700">{t('callInProgress')}</p>
              <p className="text-2xl font-mono font-bold">{formatDuration(duration)}</p>
            </div>
            <button
              onClick={handleEndCall}
              className="touch-button bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 w-full justify-center"
            >
              <PhoneOff className="w-5 h-5" />
              {t('endCall')}
            </button>
        </div>
      );
  }

  // Default: Start Call Button
  return (
    <button
      onClick={handleStartCall}
      disabled={callState !== 'idle'}
      className={cn(
        "touch-button bg-green-600 hover:bg-green-700 text-white flex items-center gap-3 w-full justify-center pulse-ring transition-all",
        callState !== 'idle' && "opacity-50 cursor-not-allowed grayscale"
      )}
    >
      <Phone className="w-6 h-6" />
      <span className="text-lg">{t('startCall')}</span>
    </button>
  );
}
