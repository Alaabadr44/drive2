import { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  height?: number;
  width?: number;
  barColor?: string;
}

export function AudioVisualizer({ stream, height = 60, width = 200, barColor = '#22c55e' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    // Initialize Audio Context (Singleton-ish per component or global)
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    
    // Always attempt to resume context
    const resumeContext = () => {
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => console.log("Audio Context Resumed via User Interaction"))
            .catch(e => console.error("Audio Context Resume failed:", e));
        }
    };

    if (ctx.state === 'suspended') {
        resumeContext();
    }
    
    // Add global listener just in case interaction is needed
    document.addEventListener('click', resumeContext);

    // Create Source and Analyser
    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 128; // 64 frequency bins
    // Smoothing helps reducing jitter
    analyserRef.current.smoothingTimeConstant = 0.8;

    try {
        sourceRef.current = ctx.createMediaStreamSource(stream.clone());
        sourceRef.current.connect(analyserRef.current);
        
    } catch (err) {
        console.error("Error connecting audio stream to visualizer:", err);
        return;
    }
    
    // Draw Loop
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    const draw = () => {
        if (!analyserRef.current || !canvasCtx) return;

        animationRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Dynamic bar width
        const barGap = 2;
        const totalGapSpace = barGap * (bufferLength - 1);
        const availableSpace = canvas.width - totalGapSpace;
        const barWidth = availableSpace / bufferLength;

        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // Scale height
            // value is 0-255. 
            const value = dataArray[i];
            const percent = value / 255;
            const barHeight = Math.max(4, percent * canvas.height); // Min height 4px

            // Color
            canvasCtx.fillStyle = barColor; // Could use gradient based on height

            // Draw
            // Center vertically? Or bottom up? Bottom up is standard.
            const y = canvas.height - barHeight;
            
            // Round corners
            if (canvasCtx.roundRect) {
                 canvasCtx.beginPath();
                 canvasCtx.roundRect(x, y, barWidth, barHeight, 4);
                 canvasCtx.fill();
            } else {
                 canvasCtx.fillRect(x, y, barWidth, barHeight);
            }

            x += barWidth + barGap;
        }
    };

    draw();

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (sourceRef.current) {
            sourceRef.current.disconnect(); 
            sourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };
  }, [stream, barColor]); // Re-init if stream changes

  // Removed early return for !stream to keep layout consistent
  // The effect handles null stream (does nothing), so canvas remains empty/flat.


  return (
    <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="rounded-lg opacity-90 transition-opacity duration-300"
    />
  );
}
