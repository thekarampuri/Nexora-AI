import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Camera, X, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const VisionHUD = ({ onClose, onDetect }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [fps, setFps] = useState(0);
    const streamRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Initialize Socket.IO connection
        socketRef.current = io('http://localhost:5001', {
            transports: ['websocket'],
            reconnection: true
        });

        socketRef.current.on('connect', () => {
            console.log("Connected to Vision Server via Socket.IO");
        });

        socketRef.current.on('detection_result', (data) => {
            if (!canvasRef.current || !data.detections) return;

            // Calculate latency (approximate, since we don't track per-frame ID easily here without more logic)
            // For now, we update FPS based on receiving speed
            setFps((prev) => {
                const now = performance.now();
                return Math.round(1000 / (now - (window.lastFrameTime || now - 30)));
            });
            window.lastFrameTime = performance.now();

            const ctx = canvasRef.current.getContext('2d');

            // Filter out 'person' detections to avoid repetitive announcements
            const filteredDetections = data.detections.filter(d =>
                d.label.toLowerCase() !== 'person'
            );

            drawDetections(ctx, filteredDetections);

            // Notify parent for TTS announcements
            const uniqueLabels = [...new Set(filteredDetections.map(d => d.label))];
            if (onDetect && uniqueLabels.length > 0) {
                onDetect(uniqueLabels);
            }
        });

        startCamera();

        return () => {
            stopCamera();
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        let interval;
        if (isStreaming) {
            // Send frames as fast as possible (limiting to ~15 FPS to not overload)
            interval = setInterval(captureAndSend, 66);
        }
        return () => clearInterval(interval);
    }, [isStreaming]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
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

    const captureAndSend = () => {
        if (!videoRef.current || !socketRef.current || !isStreaming) return;

        const video = videoRef.current;

        // Ensure video is ready
        if (video.readyState !== 4) return;

        // Draw current frame to offscreen canvas
        const offscreen = document.createElement('canvas');
        offscreen.width = video.videoWidth;
        offscreen.height = video.videoHeight;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(video, 0, 0);

        const imageBase64 = offscreen.toDataURL('image/jpeg', 0.5); // Quality 0.5 for speed

        // Emit frame to server
        socketRef.current.emit('detect_frame', { image: imageBase64, timestamp: Date.now() });
    };

    const drawDetections = (ctx, detections) => {
        if (!canvasRef.current) return;

        // Match canvas size to video if needed
        if (canvasRef.current.width !== videoRef.current.videoWidth) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.bbox;
            const width = x2 - x1;
            const height = y2 - y1;

            // Draw Box
            const isFace = det.label === 'face';
            const color = isFace ? '#ffd700' : '#00f3ff';

            ctx.strokeStyle = color;
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

            // Show ID if available
            const labelText = det.id !== -1 ? `${det.label} #${det.id}` : det.label;

            // Label Text
            ctx.fillStyle = color;
            ctx.font = '14px Orbitron, sans-serif';
            ctx.fillText(`${labelText} ${(det.confidence * 100).toFixed(0)}%`, x1 + 5, y1 - 8);
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-black/90 z-40 flex flex-col items-center justify-center p-4 backdrop-blur-xl pointer-events-auto"
        >
            {/* Top Right Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-cyan-500 hover:text-red-500 transition-colors z-50 rounded-full border border-cyan-500/30 hover:border-red-500/50 bg-black/50"
            >
                <X size={24} />
            </button>

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
