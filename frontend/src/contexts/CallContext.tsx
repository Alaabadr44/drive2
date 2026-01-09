
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { SOUNDS } from '@/constants/sounds';
import { Restaurant } from '@/data/mockData';
import { api } from '@/services/api';

type CallState = 'idle' | 'calling' | 'ringing' | 'incall' | 'busy' | 'ended' | 'thankyou';

interface CallContextType {
  callState: CallState;
  callId: string | null;
  remoteStream: MediaStream | null;
  activeRestaurant: Restaurant | null;
  initiateCall: (restaurant: Restaurant) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  incomingCallData: { callId: string; restaurantId?: string; screenName?: string } | null;
  isUploading: boolean;
}

const globalUploadedCallIds = new Set<string>();

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data for incoming call (Restaurant side)
  const [incomingCallData, setIncomingCallData] = useState<{ 
    callId: string; 
    restaurantId?: string; 
    kioskId?: string;
    kioskName?: string;
    screenName?: string; // mapping for compatibility
  } | null>(null);
  
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Store the other party's ID for signaling
  const [targetId, setTargetId] = useState<string | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const incomingCallDataRef = useRef<{ callId: string; restaurantId?: string; kioskId?: string } | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const callStateRef = useRef<CallState>(callState);

  // Recording Refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamDestination = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  // Upload Worker Ref
  const uploadWorker = useRef<Worker | null>(null);
  
  // Track uploaded call IDs to prevent duplicates (Global to handle React Strict Mode / Multiple Instances)
  const uploadedCallIdsRef = useRef<Set<string>>(globalUploadedCallIds);

  // Initialize Worker
  useEffect(() => {
    // Create worker instance
    uploadWorker.current = new Worker(new URL('../workers/uploadWorker.ts', import.meta.url), { type: 'module' });
    
    uploadWorker.current.onmessage = (e) => {
        const { status, callId, error, result } = e.data;
        if (status === 'success') {
            console.log(`✅ [Worker] Recording uploaded successfully for ${callId}`, result);
        } else {
            console.error(`❌ [Worker] Upload failed for ${callId}:`, error);
        }
        setIsUploading(false); 
    };

    return () => {
        uploadWorker.current?.terminate();
    };
  }, []);

  // Sync ref with state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);

  useEffect(() => {
    incomingCallDataRef.current = incomingCallData;
  }, [incomingCallData]);

  // --- Recording Logic ---
  const startRecording = useCallback(async (remoteStream: MediaStream) => {
      // Don't record if no callId
      if (!callId) return;

      console.log("🎙️ Initializing Call Recording...");
      
      try {
          if (!audioContext.current) {
              audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContext.current;

          // Resume context if suspended (common in Safari/Chrome autoplay policies)
          if (ctx.state === 'suspended') {
              console.log("AudioContext suspended, resuming...");
              await ctx.resume();
          }
          
          if (!mediaStreamDestination.current) {
              mediaStreamDestination.current = ctx.createMediaStreamDestination();
          }
          const dest = mediaStreamDestination.current;

          // Mix Local Stream
          if (localStream.current && localStream.current.getAudioTracks().length > 0) {
              const localSource = ctx.createMediaStreamSource(localStream.current);
              localSource.connect(dest);
          }

          // Mix Remote Stream
          if (remoteStream.getAudioTracks().length > 0) {
              const remoteSource = ctx.createMediaStreamSource(remoteStream);
              remoteSource.connect(dest);
          }

          const mixedStream = dest.stream;
          
          // Prefer audio/mp4 (better for Safari/iOS), fallback to audio/webm (Chrome)
          const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
          const recorder = new MediaRecorder(mixedStream, { mimeType });
          
          recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunks.current.push(event.data);
              }
          };

          recorder.start();
          mediaRecorder.current = recorder;
          console.log(`🎙️ Call recording started (${mimeType})`);

      } catch (err) {
          console.error("Failed to start recording:", err);
      }
  }, [callId]);

  const stopAndUploadRecording = useCallback(async (recordedCallId: string) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
          console.log("No active recording to upload.");
          return;
      }

      // Restrict to RESTAURANT role only to prevent duplicates
      if (user?.role !== 'RESTAURANT') {
          console.log(`[CallContext] User role is ${user?.role}. specific upload responsibility belongs to RESTAURANT. Skipping.`);
          return;
      }

      // Prevent double uploads
      if (uploadedCallIdsRef.current.has(recordedCallId)) {
        console.warn(`⚠️ Recording for call ${recordedCallId} already uploaded or in progress. Skipping.`);
        return;
      }
      uploadedCallIdsRef.current.add(recordedCallId);
      setIsUploading(true);

      console.log("⏹️ Stopping Call Recording...");

      return new Promise<void>((resolve) => {
          mediaRecorder.current!.onstop = async () => {
              const mimeType = mediaRecorder.current!.mimeType;
              const audioBlob = new Blob(audioChunks.current, { type: mimeType });
              audioChunks.current = []; // Reset chunks

              // File extension
              const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
              const filename = `call-${recordedCallId}.${ext}`;

              console.log(`Uploading recording: ${filename} (Size: ${audioBlob.size} bytes)`);

              try {
                  // NEW: Use Web Worker for upload
                  if (uploadWorker.current && user?.token) {
                      console.log("🚀 Dispatching upload to background worker...");
                      
                      // We need to send the blob and necessary metadata
                      // Note: We use a relative path logic or hardcoded '/api' since worker might not have access to window.location contexts as easily if not carefully handled, 
                      // but here we pass the origin + /api to be safe.
                      const apiUrl = `${window.location.origin}/api`;

                      uploadWorker.current.postMessage({
                          callId: recordedCallId,
                          file: audioBlob, // properly typed as Blob in worker
                          token: user.token,
                          apiUrl
                      });
                  } else {
                      console.warn('⚠️ Worker not ready or no token available');
                  }
              } catch (error) {
                  console.error('❌ Failed to dispatch upload:', error);
              }

              resolve();
          };

          mediaRecorder.current!.stop();
      });
  }, [user?.token, user?.role]);

  const cleanupCall = useCallback(() => {
    const currentState = callStateRef.current;
    console.log("CallContext: cleanupCall running. current state in ref:", currentState);
    
    // Stop recording if active
    if (callId && mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        stopAndUploadRecording(callId);
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Play end sound if we were in a call - REMOVED per request
    /*
    if (currentState === 'incall' || currentState === 'ringing') {
        const endSound = new Audio(SOUNDS.END_CALL);
        endSound.volume = 1.0;
        endSound.play().catch(e => console.warn("End sound failed:", e));
    }
    */

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    
    // For screen users, show thank you screen after an actual call
    // A busy signal or never-connected call should go straight to idle
    if (user?.role === 'SCREEN' && (currentState === 'incall' || currentState === 'ringing')) {
      setCallState('thankyou');
    } else {
      setCallState('idle');
    }

    setCallId(null);
    setIncomingCallData(null);
    setTargetId(null);
    setActiveRestaurant(null);
  }, [user?.role, callId, stopAndUploadRecording]); 

  // --- Pre-request Audio Permission ---
  useEffect(() => {
    // Proactively request microphone access when user is logged in
    const preRequestAudio = async () => {
        if (!user) return;
        
        // Only if we don't have a stream yet
        if (!localStream.current) {
            console.log("Pre-requesting microphone access...");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                localStream.current = stream;
                console.log("Microphone access granted and stream ready.");
            } catch (err) {
                console.error("Failed to pre-request microphone:", err);
                toast.error("Microphone permission blocked. Calls may not work.");
            }
        }
    };
    
    
    preRequestAudio();
  }, [user]);

  // --- Audio Sounds Management ---
  useEffect(() => {
    // Sound Assets
    // Generic Ringtone (Legacy fallback)
    const ringtone = new Audio(SOUNDS.RINGTONE);
    ringtone.loop = true;
    ringtone.volume = 1.0;

    // Restaurant Incoming Ringtone
    const resCallSound = new Audio(SOUNDS.RESCALL);
    resCallSound.loop = true;
    resCallSound.volume = 1.0;

    // Screen Outgoing Ringback
    const screenCallSound = new Audio(SOUNDS.SCREENCALL);
    screenCallSound.loop = true;
    screenCallSound.volume = 1.0;
    
    // Busy sound
    const busySound = new Audio(SOUNDS.BUSY);
    busySound.volume = 1.0;
    
    // End/Reject sound
    const endSound = new Audio(SOUNDS.END_CALL);
    endSound.volume = 1.0;

    // Helper to stop all
    const stopAll = () => {
        ringtone.pause();
        ringtone.currentTime = 0;
        resCallSound.pause();
        resCallSound.currentTime = 0;
        screenCallSound.pause();
        screenCallSound.currentTime = 0;
        busySound.pause();
        busySound.currentTime = 0;
    };

    const playSound = async (audio: HTMLAudioElement) => {
        try {
            audio.currentTime = 0;
            await audio.play();
        } catch (e) {
            console.warn("Audio play failed (interaction required?):", e);
        }
    };

    // State Reaction
    if (callState === 'ringing') {
        // Distinguish between Incoming (Restaurant) and Outgoing (Screen)
        if (user?.role === 'RESTAURANT') {
             playSound(resCallSound);
        } else {
             playSound(screenCallSound);
        }
    } else if (callState === 'busy') {
        // playSound(busySound); // Removed per request
    } else if (callState === 'ended') {
        // playSound(endSound); // Removed per request
    } 

    // Cleanup when state changes or component unmounts
    return () => {
        stopAll();
    };
  }, [callState]); // Re-run when callState changes

  // --- Thank You Screen Timer (Screen side) ---
  useEffect(() => {
    if (callState === 'thankyou' && user?.role === 'SCREEN') {
        const timer = setTimeout(() => {
            setCallState('idle');
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [callState, user?.role]);

  const setupPeerConnection = useCallback(async (currentCallId: string, currentTargetId: string) => {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', {
          type: 'candidate',
          payload: event.candidate,
          callId: currentCallId,
          targetId: currentTargetId,
          targetType: user?.role === 'SCREEN' ? 'restaurant' : 'screen'
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      
      // Safety: Mute audio initially for 400ms to allow stabilization
      if (user?.role === 'RESTAURANT') {
          event.streams[0].getAudioTracks().forEach(track => {
              track.enabled = false;
              setTimeout(() => {
                  track.enabled = true;
                  console.log("🔊 Unmuted audio after stabilization delay");
              }, 400); // 400ms delay per request
          });
      }

      // Start recording when we receive remote audio
      startRecording(event.streams[0]);
    };

    // Use existing local stream if available, otherwise get new one
    let stream = localStream.current;
    if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
        try {
            console.log("Getting new media stream for call...");
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStream.current = stream;
        } catch (err) {
            console.error('Error accessing microphone:', err);
            toast.error('Microphone access denied');
            return null;
        }
    } else {
        console.log("Reusing existing media stream");
    }

    if (stream) {
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream!); // Non-null assertion safe due to check
        });
    }
    
    peerConnection.current = pc;
    return pc;
  }, [socket, user?.role, startRecording]);

  // --- Actions ---

  const initiateCall = (restaurant: Restaurant) => {
    if (!socket) return;
    const screenId = user?.screenId || user?.id; // Use correct ID
    if (!screenId) {
        console.error("Missing screen ID");
        return;
    }

    setCallState('calling'); // Local state
    setTargetId(restaurant.id); // We are calling this restaurant
    setActiveRestaurant(restaurant);

    socket.emit('call:request', { 
        restaurantId: restaurant.id, 
        screenId
    });
  };

  const acceptCall = () => {
    if (!socket || !incomingCallData) return;
    const currentCallId = incomingCallData.callId;
    
    // As Restaurant, target is the kiosk
    if (incomingCallData.kioskId) {
        setTargetId(incomingCallData.kioskId);
        // We do NOT setup connection here anymore to avoid race conditions.
        // We wait for call:accepted event which fires for both parties.
    }
    
    socket.emit('call:accept', { callId: currentCallId });
    setCallId(currentCallId);
    setCallState('incall'); 
  };

  const rejectCall = () => {
    if (!socket || !incomingCallData) return;
    socket.emit('call:reject', { callId: incomingCallData.callId });
    cleanupCall();
  };

  const endCall = () => {
    console.log("CallContext: endCall triggered", { callId, callState, socketConnected: socket?.connected });
    if (!socket || !callId) {
        console.warn("CallContext: Cannot emit call:end (missing socket or callId). performing local cleanup.");
        cleanupCall();
        return;
    }
    socket.emit('call:end', { callId });
    cleanupCall();
  };

  // --- Socket Events ---

  useEffect(() => {
    if (!socket) return;

    // 1. Call Status (Screen)
    socket.on('call:status', (data: { status: string; callId?: string }) => {
        console.log("CallContext: Received call:status", data);
        if (data.status === 'RINGING') {
            setCallState('ringing');
            if (data.callId) {
                setCallId(data.callId);
            } else {
                console.warn("CallContext: RINGING status received without callId!");
            }
        } else if (data.status === 'BUSY') {
            setCallState('busy');
            // Toast removed per request
            setTimeout(cleanupCall, 12000);
        }
    });

    // 2. Incoming Call (Restaurant)
    socket.on('call:incoming', (data: { callId: string; restaurantId: string; kioskId: string; kioskName?: string; screenName?: string }) => {
        setIncomingCallData({ 
            ...data, 
            screenName: data.kioskName || data.screenName || `Screen ${data.kioskId?.slice(0,4) || 'Unknown'}`
        });
        setCallId(data.callId);
        setCallState('ringing');
    });

    // 3. Call Accepted (Join Room & Initiate WebRTC)
    socket.on('call:accepted', async (data: { callId: string }) => {
        setCallState('incall');
        
        // Use Ref to ensure we get the latest targetId even if state update is pending
        // Fallback: If Restaurant, use incomingCallDataRef
        let currentTargetId = targetIdRef.current;
        
        if (!currentTargetId && user?.role === 'RESTAURANT' && incomingCallDataRef.current?.kioskId) {
             console.log("CallContext: targetId missing in state, using incomingCallDataRef");
             currentTargetId = incomingCallDataRef.current.kioskId;
        }

        console.log("CallContext: call:accepted. Role:", user?.role, "Target:", currentTargetId);

        if (callId && currentTargetId) {
            const pc = await setupPeerConnection(callId, currentTargetId);
            
            // Only SCREEN creates the offer (Caller)
            // Restaurant (Callee) waits for the offer
            if (pc && user?.role === 'SCREEN') {
                console.log("CallContext: I am SCREEN, creating offer...");
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                socket.emit('webrtc:signal', {
                  type: 'offer',
                  payload: offer,
                  callId: callId,
                  targetId: currentTargetId,
                  targetType: 'restaurant'
                });
            }
        } else {
             console.warn("CallContext: Cannot setup peer connection. Missing callId or targetId", { callId, currentTargetId });
        }
    });

    // 4. WebRTC Signals (Both)
    socket.on('webrtc:signal', async (data: { type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit; callId: string; senderId?: string }) => {
        const pc = peerConnection.current;
        if (!pc) return; // Should be initialized by accept/accepted events

        if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // As Receiver (Restaurant), we reply to sender
            // We need target ID. 'senderId' from payload? Guide says "targetId: senderId".
            // If data doesn't have senderId, we rely on stored targetId (kioskId)
            
            socket.emit('webrtc:signal', {
              type: 'answer',
              payload: answer,
              callId: data.callId,
              targetId: targetId, // Use stored target
              targetType: user?.role === 'SCREEN' ? 'restaurant' : 'screen' // Reply to other type
            });
            
        } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
            
        } else if (data.type === 'candidate') {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.payload as RTCIceCandidateInit));
            } catch (e) {
                console.error("Error adding ice candidate", e);
            }
        }
    });

    // 5. Call Ended
    socket.on('call:ended', () => {
        cleanupCall();
        // Toast removed
    });
    
    // 6. Rejected
    socket.on('call:rejected', () => {
        cleanupCall(); 
        // Toast removed
    });

    return () => {
        socket.off('call:status');
        socket.off('call:incoming');
        socket.off('call:accepted');
        socket.off('webrtc:signal');
        socket.off('call:ended');
        socket.off('call:rejected');
    };
  }, [socket, callId, targetId, user?.role, setupPeerConnection, cleanupCall]);


  // --- Watchdog: Stuck in Loading Safety Net ---
  useEffect(() => {
    if (callState === 'incall' && !remoteStream && !peerConnection.current && socket && incomingCallDataRef.current && user?.role === 'RESTAURANT') {
         console.log("⚠️ Watchdog: Call is 'incall' but no connection yet. Retrying acceptance...");
         const timer = setTimeout(() => {
             // If still stuck after 2s
             if (callStateRef.current === 'incall' && !peerConnection.current) {
                 console.log("🚨 Watchdog: Re-emitting call:accept!!!");
                 socket.emit('call:accept', { callId: incomingCallDataRef.current!.callId });
             }
         }, 2000); // 2 seconds delay
         return () => clearTimeout(timer);
    }
  }, [callState, remoteStream, socket, user?.role]);

  return (
    <CallContext.Provider value={{
      callState,
      callId,
      remoteStream,
      activeRestaurant,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      incomingCallData,
      isUploading
    }}>
      {children}
    </CallContext.Provider>
  );
};

// eslint-disable-next-line
export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
