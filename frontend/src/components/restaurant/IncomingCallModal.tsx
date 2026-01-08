import { useCall } from '@/contexts/CallContext';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function IncomingCallModal() {
  const { incomingCallData, acceptCall, rejectCall, callState } = useCall();
  const isOpen = !!incomingCallData && (callState === 'ringing' || callState === 'idle');

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-white/10">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
            <Phone className="w-10 h-10 text-blue-600 animate-bounce" />
          </div>
          <DialogTitle className="text-2xl font-bold">Incoming Call</DialogTitle>
          <DialogDescription className="text-lg text-gray-600 dark:text-gray-300">
            {incomingCallData?.screenName || 'Kiosk'} is calling...
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-8 py-6">
          <div className="text-center space-y-2">
            <Button
              size="lg"
              variant="destructive"
              className="w-16 h-16 rounded-full p-0 shadow-lg hover:scale-110 transition-transform"
              onClick={rejectCall}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <p className="text-xs font-medium text-gray-500">Decline</p>
          </div>

          <div className="text-center space-y-2">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full p-0 bg-green-500 hover:bg-green-600 shadow-lg hover:scale-110 transition-transform"
              onClick={acceptCall}
            >
              <Phone className="w-8 h-8 text-white" />
            </Button>
            <p className="text-xs font-medium text-gray-500">Accept</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
