import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Camera, X, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const VisionHUD = ({ onClose, onDetect }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [scanMode, setScanMode] = useState('face'); // 'face' or 'object'
    const [fps, setFps] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerName, setRegisterName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const streamRef = useRef(null);
    const socketRef = useRef(null);

    const handleRegister = async () => {
        if (!videoRef.current || !registerName) return;
        setIsSubmitting(true);

        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

            const response = await fetch('http://localhost:5001/register-face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64, name: registerName })
            });

            if (response.ok) {
                alert(`Identity Verified: ${registerName.toUpperCase()}`);
                setIsRegistering(false);
                setRegisterName("");
            } else {
                alert("Registration Failed. Try again.");
            }
        } catch (error) {
            console.error("Registration Error:", error);
            alert("Connection Error");
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        // Initialize Socket.IO connection
        socketRef.current = io('http://localhost:5001', {
            transports: ['websocket'],
            reconnection: true
        });

        socketRef.current.on('connect', () => {
            console.log("Connected to Vision Server via Socket.IO");
            // Set initial mode
            socketRef.current.emit('set_mode', 'face');
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

    // Effect to switch mode on server
    useEffect(() => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('set_mode', scanMode);
        }
    }, [scanMode]);

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
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

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
        if (!canvasRef.current || !videoRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Ensure we have valid video dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        // Match canvas resolution to the displayed video size
        if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
        }

        // Calculate scaling factors (Backend coordinates -> Frontend display size)
        const scaleX = video.clientWidth / video.videoWidth;
        const scaleY = video.clientHeight / video.videoHeight;

        if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        detections.forEach(det => {
            let [bx1, by1, bx2, by2] = det.bbox;

            // Apply scaling
            const x1 = bx1 * scaleX;
            const y1 = by1 * scaleY;
            const x2 = bx2 * scaleX;
            const y2 = by2 * scaleY;

            const width = x2 - x1;
            const height = y2 - y1;

            let color = '#00f3ff'; // Default Cyan (Object)
            let labelText = '';

            if (det.label === 'face') {
                if (det.name && det.name !== "Unknown") {
                    // Verified Face
                    color = '#00ff00'; // Green
                    labelText = `${det.name.toUpperCase()} [VERIFIED]`;
                } else {
                    // Unknown Face
                    color = '#ffd700'; // Gold
                    labelText = `UNKNOWN #${det.id}`;
                }
            } else {
                // Object
                labelText = det.id !== -1 ? `${det.label} #${det.id}` : det.label;
            }

            // Draw Box
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
            ctx.fillRect(x1, y1 - 25, ctx.measureText(labelText).width + 20, 25);

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
                        {scanMode === 'face' ? 'IDENTITY_CORE' : 'OBJECT_CORE'}: ONLINE
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

            {/* Controls */}
            <div className="flex gap-4 mt-6">
                <button
                    onClick={() => setIsRegistering(true)}
                    className="px-6 py-3 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-all rounded font-orbitron tracking-widest flex items-center gap-2 text-sm"
                >
                    <Activity size={16} />
                    REGISTER ID
                </button>

                <div className="flex bg-black/50 border border-cyan-500/30 rounded overflow-hidden">
                    <button
                        onClick={() => setScanMode('face')}
                        className={`px-6 py-3 transition-colors font-orbitron text-sm ${scanMode === 'face'
                            ? 'bg-cyan-500/40 text-cyan-100'
                            : 'text-cyan-500/50 hover:text-cyan-400'
                            }`}
                    >
                        IDENTITY
                    </button>
                    <div className="w-[1px] bg-cyan-500/30"></div>
                    <button
                        onClick={() => setScanMode('object')}
                        className={`px-6 py-3 transition-colors font-orbitron text-sm ${scanMode === 'object'
                            ? 'bg-cyan-500/40 text-cyan-100'
                            : 'text-cyan-500/50 hover:text-cyan-400'
                            }`}
                    >
                        OBJECTS
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all rounded font-orbitron tracking-widest flex items-center gap-2 text-sm"
                >
                    <X size={16} />
                    EXIT
                </button>
            </div>

            {/* Registration Modal */}
            {isRegistering && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-cyan-500/50 p-6 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                        <h3 className="text-cyan-400 font-orbitron text-xl mb-4">NEW IDENTITY REGISTRATION</h3>
                        <input
                            type="text"
                            placeholder="ENTER NAME"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="w-full bg-black border border-cyan-500/30 text-cyan-100 p-3 rounded mb-4 focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setIsRegistering(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleRegister}
                                disabled={isSubmitting || !registerName}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold disabled:opacity-50"
                            >
                                {isSubmitting ? "PROCESSING..." : "CONFIRM"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default VisionHUD;
