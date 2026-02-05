import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const ChatInterface = () => {
    const { addLog, toggleDevice, devices, user } = useApp();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSttSupported, setIsSttSupported] = useState(true);
    const [sttStatus, setSttStatus] = useState('READY'); // READY, LISTENING, ERROR, UNSUPPORTED
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef(''); // Use ref for stable transcript storage
    const restartTimeoutRef = useRef(null);
    const isListeningRef = useRef(false); // Ref to avoid stale closures in event handlers

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    useEffect(() => {
        inputRef.current?.focus();

        // 1. Check Security Context
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // 2. Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            setIsSttSupported(false);
            setSttStatus('UNSUPPORTED');
        } else if (!isSecure) {
            console.warn("Speech Recognition requires a secure context (HTTPS or localhost).");
            setIsSttSupported(false);
            setSttStatus('INSECURE_CONTEXT');
        } else {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscriptChunk = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscriptChunk += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscriptChunk) {
                    transcriptRef.current += finalTranscriptChunk;
                }

                const currentText = transcriptRef.current + interimTranscript;
                console.log("STT_RESULT:", currentText); // Diagnostic log
                if (currentText) {
                    setInput(currentText);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setSttStatus('ERROR');
                addLog(`STT_ERROR: ${event.error}`);

                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    isListeningRef.current = false;
                    alert("Microphone access denied. Please enable it in browser settings.");
                } else if (event.error === 'network') {
                    console.warn("Speech Recognition Network Error detected.");
                    setSttStatus('NETWORK_ERROR');
                    // We don't set isListening to false here so onend can attempt a restart
                } else if (event.error === 'no-speech') {
                    console.log("STT_SESSION: No speech detected, will restart...");
                } else {
                    setIsListening(false);
                    isListeningRef.current = false;
                }
            };

            recognitionRef.current.onend = () => {
                if (isListeningRef.current) {
                    console.log("STT_SESSION: Continuous mode restart...");
                    // Add a 100ms delay to avoid browser "already started" conflict
                    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                    restartTimeoutRef.current = setTimeout(() => {
                        if (isListeningRef.current) {
                            try {
                                recognitionRef.current.start();
                                console.log("STT_SESSION: Auto-restarted");
                            } catch (err) {
                                console.error("STT_SESSION: Restart failed", err);
                                setIsListening(false);
                                isListeningRef.current = false;
                                setSttStatus('READY');
                            }
                        }
                    }, 100);
                } else {
                    setSttStatus('READY');
                }
            };
        }

        // Cleanup on unmount
        return () => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            if (recognitionRef.current) {
                // Ensure recognition stops completely
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const toggleListening = () => {
        if (!isSttSupported) {
            alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
            return;
        }

        if (isListeningRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current?.stop();
            setSttStatus('READY');
            if (input.trim()) {
                processCommand(input);
            }
        } else {
            try {
                setInput('');
                transcriptRef.current = ''; // Reset transcript ref
                window.speechSynthesis.cancel();
                recognitionRef.current?.start();
                isListeningRef.current = true;
                setIsListening(true);
                setSttStatus('LISTENING');
                addLog("STT_SESSION: Initialized");
            } catch (err) {
                console.error("Failed to start recognition:", err);
                isListeningRef.current = false;
                setIsListening(false);
                setSttStatus('ERROR');
            }
        }
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nextMuted && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };

    const speakResponse = (text) => {
        if (!window.speechSynthesis || isMuted) return;

        // Clean markdown for better speech
        const cleanText = text
            .replace(/[*#_>`]/g, '') // Remove formatting chars
            .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
            .replace(/SYSTEM_TIME:.*?/g, 'The current system time is ')
            .replace(/STATUS:.*?/g, 'The current system status is ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 0.9; // Slightly lower for futuristic feel

        // Find a suitable voice (optional, but premium feel)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    };

    const processCommand = async (cmd) => {
        const lowerCmd = cmd.toLowerCase();
        setIsProcessing(true);

        // Add user message to history
        const userMsg = { role: 'user', content: cmd, id: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        let reply = "";
        let action = "";

        // 1. LOCAL COMMAND HANDLERS
        if (/^\b(hello|hi|hey)\b/i.test(lowerCmd)) {
            reply = `GOOD_SESSION, ${user?.username || 'ADMIN'}. NEXORA_STATUS: CALIBRATED.`;
            action = "Local: Greeting";
        }
        else if (/\b(system time|current date)\b/i.test(lowerCmd)) {
            reply = `SYSTEM_TIME: ${new Date().toLocaleString()}`;
            action = "Local: Time check";
        }
        else if (/\b(open google|search google)\b/i.test(lowerCmd)) {
            reply = "REDIRECT: Initializing Google Search Grid...";
            window.open('https://google.com', '_blank');
            action = "Local: Opened Google";
        }
        else if (/^(?:turn|switch)\s+on\s+(?:the\s+)?(light|fan)/i.test(lowerCmd)) {
            if (lowerCmd.includes('light')) {
                toggleDevice('classroomLight', true);
                reply = "ACCESS: Classroom illumination enabled.";
            } else if (lowerCmd.includes('fan')) {
                toggleDevice('labFan', true);
                reply = "ACCESS: Lab ventilation engaged.";
            }
            action = "Local: Device ON";
        }
        else if (/^(?:turn|switch)\s+off\s+(?:the\s+)?(light|fan)/i.test(lowerCmd)) {
            if (lowerCmd.includes('light')) {
                toggleDevice('classroomLight', false);
                reply = "ACCESS: Classroom illumination disabled.";
            } else if (lowerCmd.includes('fan')) {
                toggleDevice('labFan', false);
                reply = "ACCESS: Lab ventilation disengaged.";
            }
            action = "Local: Device OFF";
        }
        else if (lowerCmd.includes('status') || lowerCmd.includes('report')) {
            reply = `STATUS: LIGHT[${devices.classroomLight ? 'ON' : 'OFF'}] | FAN[${devices.labFan ? 'ON' : 'OFF'}]`;
            action = "Local: Status Report";
        }

        // 2. REMOTE AI CORE (Backend Proxy)
        if (!reply) {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: cmd })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "AI core handshake failed");
                }

                const data = await res.json();
                reply = data.response;
                action = "Gemini: Link Active";
            } catch (error) {
                console.error("AI Error:", error);
                reply = `${error.message}. PROTOCOL_FALLBACK.`;
                action = "Fail: Backend Error";
            }
        }

        // Add AI response to history
        const aiMsg = { role: 'ai', content: reply, id: Date.now() + 1 };
        setMessages(prev => [...prev, aiMsg]);

        speakResponse(reply);

        addLog(action);
        setIsProcessing(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        processCommand(input);
        setInput('');
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[70vh] flex flex-col z-30 pointer-events-none">
            {/* Scrollable Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar pointer-events-auto">
                <div className="flex flex-col gap-6">
                    <AnimatePresence mode='popLayout'>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] px-6 py-4 rounded-xl border backdrop-blur-md transition-all ${msg.role === 'user'
                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                    : 'bg-black/60 border-cyan-400/50 text-cyan-100 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                                    }`}>
                                    <div className="font-orbitron text-[10px] uppercase tracking-widest opacity-50 mb-2">
                                        {msg.role === 'user' ? 'AUTH_USER' : 'NEXORA_CORE'}
                                    </div>
                                    <div className="prose prose-invert prose-cyan max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-cyan-500/20">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 px-6 py-4 rounded-xl flex gap-2">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Fixed at Bottom */}
            <div className="mt-6 pointer-events-auto">
                <form onSubmit={handleSubmit} className="relative group px-4">
                    <div className="absolute inset-0 bg-cyan-500/5 blur-xl group-focus-within:bg-cyan-500/10 transition-all rounded-full"></div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isProcessing ? "PROCESSING_QUERY..." : "INPUT_COMMAND_CORE..."}
                        disabled={isProcessing}
                        className="w-full bg-black/40 backdrop-blur-xl border-b-2 border-cyan-500/50 py-5 px-8 text-xl text-center text-cyan-50 font-orbitron focus:outline-none focus:border-cyan-400 transition-all placeholder-cyan-500/20 rounded-t-lg"
                    />
                    <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#00f3ff]"></div>

                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={toggleMute}
                            className={`transition-colors ${isMuted ? 'text-red-500/50 hover:text-red-400' : 'text-cyan-500/50 hover:text-cyan-400'}`}
                            title={isMuted ? "Unmute Nexora" : "Mute Nexora"}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={isProcessing || !isSttSupported}
                            className={`transition-all ${!isSttSupported ? 'opacity-20 cursor-not-allowed' : (isListening ? 'text-red-500 animate-pulse scale-110' : (sttStatus === 'NETWORK_ERROR' ? 'text-orange-500' : 'text-cyan-500/50 hover:text-cyan-400'))} disabled:opacity-30`}
                            title={
                                sttStatus === 'INSECURE_CONTEXT' ? "Requires HTTPS/localhost" :
                                    sttStatus === 'NETWORK_ERROR' ? "Speech server unavailable (Check Internet)" :
                                        !isSttSupported ? "Speech not supported" :
                                            (isListening ? "Stop Recording" : "Start Recording")
                            }
                        >
                            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button
                            type="submit"
                            disabled={isProcessing || isListening}
                            className="text-cyan-500/50 hover:text-cyan-400 transition-colors disabled:opacity-30"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
