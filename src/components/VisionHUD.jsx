
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const VisionHUD = ({ onClose, onDetect }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [fps, setFps] = useState(0);
    const lastRequestRef = useRef(0);
    const streamRef = useRef(null);
    const [detectedItems, setDetectedItems] = useState([]);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (isStreaming) {
            const interval = setInterval(captureAndDetect, 500); // Pulse every 500ms
            return () => clearInterval(interval);
        }
    }, [isStreaming]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setIsStreaming(true);
        } catch (err) {
            console.error("Camera Access Error:", err);
            onClose();
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsStreaming(false);
    };

    const captureAndDetect = async () => {
        if (!videoRef.current || !canvasRef.current || !isStreaming) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Match canvas size to video
        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        // Draw current frame to hidden canvas process (or use the visible one for overlay clearing)
        // We will just send base64 to server
        const offscreen = document.createElement('canvas');
        offscreen.width = video.videoWidth;
        offscreen.height = video.videoHeight;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(video, 0, 0);

        const imageBase64 = offscreen.toDataURL('image/jpeg', 0.5); // Quality 0.5 for speed

        const start = performance.now();
        try {
            const response = await fetch('http://localhost:5001/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64 })
            });

            if (response.ok) {
                const data = await response.json();
                drawDetections(ctx, data.detections);

                // Calculate pseudo-FPS based on round trip
                const duration = performance.now() - start;
                setFps(Math.round(1000 / duration));

                // Notify parent for TTS announcements
                const uniqueLabels = [...new Set(data.detections.map(d => d.label))];
                if (onDetect && uniqueLabels.length > 0) {
                    onDetect(uniqueLabels);
                }
            }
        } catch (err) {
            console.error("Vision Inference Error:", err);
        }
    };

    const drawDetections = (ctx, detections) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Semi-transparent overlay for "HUD" look
        // ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
        // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.bbox;
            const width = x2 - x1;
            const height = y2 - y1;

            // Draw Box
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, width, height);

            // Draw Corners (HUD Style)
            const cornerLen = 10;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            // Top-Left
            ctx.beginPath(); ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1); ctx.stroke();
            // Bottom-Right
            ctx.beginPath(); ctx.moveTo(x2, y2 - cornerLen); ctx.lineTo(x2, y2); ctx.lineTo(x2 - cornerLen, y2); ctx.stroke();

            // Label Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x1, y1 - 25, ctx.measureText(det.label).width + 20, 25);

            // Label Text
            ctx.fillStyle = '#00f3ff';
            ctx.font = '14px Orbitron, sans-serif';
            ctx.fillText(`${det.label} ${(det.confidence * 100).toFixed(0)}%`, x1 + 5, y1 - 8);
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-black/90 z-40 flex flex-col items-center justify-center p-4 backdrop-blur-xl"
        >
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                {/* Video Feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />

                {/* Overlay Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* HUD Elements */}
                <div className="absolute top-4 left-4 flex gap-4">
                    <div className="bg-black/50 px-3 py-1 border border-cyan-500/50 rounded text-cyan-400 font-mono text-xs flex items-center gap-2">
                        <Activity size={14} className="animate-pulse" />
                        VISION_CORE: ONLINE
                    </div>
                    <div className="bg-black/50 px-3 py-1 border border-cyan-500/50 rounded text-cyan-400 font-mono text-xs">
                        LATENCY: {fps}ms
                    </div>
                </div>

                {/* Scanning Line Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="w-full h-[2px] bg-cyan-500/50 shadow-[0_0_20px_#00f3ff] animate-[scan_3s_linear_infinite]"></div>
                </div>
            </div>

            <button
                onClick={onClose}
                className="mt-6 px-8 py-3 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:text-red-200 transition-all rounded font-orbitron tracking-widest flex items-center gap-2"
            >
                <X size={18} />
                TERMINATE VISUAL LINK
            </button>
        </motion.div>
    );
};

export default VisionHUD;
