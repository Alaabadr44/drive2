import { useEffect, useRef } from 'react';
import { useCall } from '@/contexts/CallContext';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThankYouOverlay } from './ThankYouOverlay';

export function CallOverlay() {
  const { callState, endCall, remoteStream } = useCall();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;
  
  // Always show Thank You screen for all users
  if (callState === 'thankyou') return <ThankYouOverlay />;
  
  // For SCREEN and RESTAURANT users, we only want the audio element, not the UI overlay
  const showUI = user?.role !== 'SCREEN' && user?.role !== 'RESTAURANT';

  return (
    <>
      {showUI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm p-8 bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl border border-white/5 text-center space-y-8 animate-in fade-in zoom-in duration-300">
            
            {/* Status Indicator */}
            <div className="relative inline-block">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors duration-500 bg-white/5",
                callState === 'incall' && "bg-green-500/10 text-green-400",
                callState === 'busy' && "bg-red-500/10 text-red-400"
              )}>
                <Phone className={cn("w-10 h-10", (callState === 'calling' || callState === 'ringing') && "animate-pulse text-white/50")} />
              </div>
            </div>

            {/* Text Status */}
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {callState === 'calling' && "Connecting..."}
                {callState === 'ringing' && "Ringing..."}
                {callState === 'incall' && "Connected"}
                {callState === 'busy' && "Line Busy"}
                {callState === 'ended' && "Call Ended"}
              </h2>
              <p className="text-white/40 text-lg">
                {callState === 'incall' ? "Speaking with Restaurant" : "Please wait..."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-20 h-20 p-0 shadow-2xl shadow-red-600/20 bg-red-600 hover:bg-red-700 transition-transform active:scale-90"
                onClick={endCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Audio Element - MUST stay mounted for audio to play */}
      <audio ref={audioRef} autoPlay playsInline controls={false} />
    </>
  );
}
