import React, { useState, useEffect, useRef } from 'react';
import { split } from 'postcss/lib/list';
import { useApp } from '../context/AppContext';
import { Send, Mic, MicOff, Volume2, VolumeX, Camera as CameraIcon, Copy, Edit, Check } from 'lucide-react';
import VisionHUD from './VisionHUD';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { parseCommand } from '../utils/commandParser';
import WeatherWidget from './features/WeatherWidget';
import NewsFeed from './features/NewsFeed';
import DigitalClock from './features/DigitalClock';

const ChatInterface = () => {
    const { addLog, toggleDevice, devices, user } = useApp();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSttSupported, setIsSttSupported] = useState(true);
    const [sttStatus, setSttStatus] = useState('READY'); // READY, LISTENING, ERROR, UNSUPPORTED
    const [isVisionMode, setIsVisionMode] = useState(false);
    const [showWeather, setShowWeather] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [showClock, setShowClock] = useState(false);
    const [lastAnnouncedLabels, setLastAnnouncedLabels] = useState([]);
    const [copiedId, setCopiedId] = useState(null); // Track which message was copied
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef(''); // Use ref for stable transcript storage
    const restartTimeoutRef = useRef(null);
    const isListeningRef = useRef(false); // Ref to avoid stale closures in event handlers
    const isActiveModeRef = useRef(false); // Ref to track if we are actively waiting for a command
    const silenceTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleEdit = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    useEffect(() => {
        // 1. Check Security Context
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // 2. Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            setIsSttSupported(false);
            setSttStatus('UNSUPPORTED');
            return;
        } else if (!isSecure) {
            console.warn("Speech Recognition requires a secure context.");
            setIsSttSupported(false);
            setSttStatus('INSECURE_CONTEXT');
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        const startSilenceTimer = () => {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
                if (isActiveModeRef.current) {
                    console.log("STT: Silence timeout - reverting to passive mode");
                    isActiveModeRef.current = false;
                    setInput('');
                    speakResponse("I didn't hear anything.");
                }
            }, 6000); // 6 seconds silence timeout
        };

        recognitionRef.current.onresult = (event) => {
            // Reset silence timer on any speech
            if (isActiveModeRef.current) startSilenceTimer();

            let interimTranscript = '';
            let finalTranscriptChunk = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptChunk += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const lowerCaseChunk = finalTranscriptChunk.toLowerCase();
            const lowerCaseInterim = interimTranscript.toLowerCase();

            // 1. WAKE WORD DETECTION (Always Check)
            if (lowerCaseChunk.includes("hey nexora") || lowerCaseInterim.includes("hey nexora")) {
                isActiveModeRef.current = true;
                transcriptRef.current = ''; // Reset buffer
                setInput("Listening for command...");
                startSilenceTimer(); // Start counting down silence
                return;
            }

            // 2. COMMAND EXECUTION (Only if Active)
            if (isActiveModeRef.current) {
                setInput(interimTranscript || finalTranscriptChunk);

                if (finalTranscriptChunk.trim().length > 0) {
                    // Command Received!
                    const commandText = finalTranscriptChunk.replace(/hey nexora/gi, '').trim();
                    if (commandText) {
                        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current); // Stop silence timer
                        processCommand(commandText);
                        isActiveModeRef.current = false; // Return to passive mode
                        transcriptRef.current = '';
                    }
                }
            }
        };

        recognitionRef.current.onerror = (event) => {
            // Network and no-speech errors are normal during continuous recognition
            // They trigger auto-restart, so we don't need to log them as errors
            if (event.error === 'network' || event.error === 'no-speech') {
                return;
            }
            console.error("Speech Recognition Error:", event.error);
            setSttStatus('ERROR');
            if (event.error === 'not-allowed') {
                setIsListening(false);
                isListeningRef.current = false;
            }
        };

        recognitionRef.current.onend = () => {
            // AUTO-RESTART for "Always On" feel
            if (isListeningRef.current) {
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                restartTimeoutRef.current = setTimeout(() => {
                    if (isListeningRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                            console.log("STT: Resumed listening...");
                        } catch (e) {
                            console.log("STT: Restart failed", e);
                        }
                    }
                }, 200);
            } else {
                setSttStatus('READY');
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            }
        };

        return () => {
            isListeningRef.current = false;
            if (recognitionRef.current) recognitionRef.current.stop();
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        };
    }, []);

    const toggleListening = () => {
        if (!isSttSupported) return;

        if (isListeningRef.current) {
            // STOP EVERYTHING
            isListeningRef.current = false;
            isActiveModeRef.current = false;
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            setIsListening(false);
            recognitionRef.current?.stop();
            setSttStatus('READY');
            addLog("STT: Microphone Deactivated");
        } else {
            // START LISTENING (Active Mode)
            try {
                transcriptRef.current = '';
                recognitionRef.current?.start();

                isListeningRef.current = true; // Enable the loop
                isActiveModeRef.current = true; // Enable command processing immediately

                // Start silence timer since we are active
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isActiveModeRef.current) {
                        console.log("STT: Silence timeout - reverting to passive mode");
                        isActiveModeRef.current = false;
                        setInput('');
                        speakResponse("I didn't hear anything.");
                    }
                }, 6000);



                setIsListening(true);
                setSttStatus('LISTENING');
                addLog("STT: Microphone Activated");
                speakResponse("Ready.");
            } catch (err) {
                console.error("Failed to start:", err);
                // If already started, just sync state
                isListeningRef.current = true;
                setIsListening(true);
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
        const command = parseCommand(cmd);

        if (command) {
            console.log("COMMAND DETECTED:", command);

            if (command.type === 'ui') {
                if (command.component === 'weather') { setShowWeather(true); reply = "Displaying atmospheric data."; }
                if (command.component === 'news') { setShowNews(true); reply = "Accessing global news feed."; }
                if (command.component === 'clock') { setShowClock(true); reply = "Synchronizing time."; }
                action = `UI: Show ${command.component}`;
            }

            else if (command.type === 'system') {
                try {
                    const res = await fetch('/api/system/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: command.action })
                    });
                    const data = await res.json();

                    if (command.action === 'battery') {
                        reply = data.error ? "Battery data unavailable." :
                            `Battery is at ${data.percent}%. Status: ${data.status}.`;
                    } else {
                        reply = `System ${command.action} executed.`;
                    }
                    action = `System: ${command.action}`;
                } catch (e) {
                    reply = "Failed to access system controls.";
                }
            }

            else if (command.type === 'media') {
                try {
                    fetch('/api/system/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: command.action })
                    });
                    reply = `Media ${command.action} executed.`;
                    action = `Media: ${command.action}`;
                } catch (e) { }
            }

            else if (command.type === 'web') {
                try {
                    fetch('/api/web/open', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: command.url })
                    });
                    reply = `Opening ${command.url}...`;
                    action = `Web: ${command.url}`;
                } catch (e) { }
            }

            else if (command.type === 'app') {
                try {
                    fetch('/api/app/launch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ app_name: command.app_name })
                    });
                    reply = `Launching ${command.app_name}...`;
                    action = `App: ${command.app_name}`;
                } catch (e) { }
            }

            else if (command.type === 'automation') {
                try {
                    let endpoint = `/api/automation/${command.service}`;
                    let body = { action: command.action };
                    if (command.service === 'whatsapp') { body.contact = command.contact; body.message = command.message; }
                    if (command.service === 'youtube') { body.query = command.query; }

                    fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    reply = `Executing ${command.service} automation: ${command.action}`;
                    action = `Auto: ${command.service}`;
                } catch (e) {
                    reply = `Failed to execute ${command.service} command.`;
                }
            }

            else if (command.type === 'file') {
                try {
                    fetch('/api/system/file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: command.action, path: command.path, content: command.content })
                    });
                    reply = `File operation ${command.action} initiated.`;
                    action = `File: ${command.action}`;
                } catch (e) { }
            }

            else if (command.type === 'editor') {
                try {
                    fetch('/api/automation/editor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: command.action, text: command.text })
                    });
                    reply = `Text Editor: ${command.action}`;
                    action = `Editor: ${command.action}`;
                } catch (e) { }
            }
        }

        else if (/^\b(hello|hi|hey)\b/i.test(lowerCmd)) {
            reply = `GOOD_SESSION, ${user?.username || 'ADMIN'}. NEXORA_STATUS: CALIBRATED.`;
            action = "Local: Greeting";
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

    const handleVisionDetect = (labels) => {
        // Advanced cooldown logic to prevent repetitive announcements
        const now = Date.now();
        const COOLDOWN_MS = 5000; // 5 seconds cooldown per object

        // Filter for truly new items (not announced recently)
        const newItems = labels.filter(label => {
            const lastAnnounced = lastAnnouncedLabels.find(item =>
                typeof item === 'object' ? item.label === label : item === label
            );

            if (!lastAnnounced) return true; // Never announced

            // If it's an object with timestamp, check cooldown
            if (typeof lastAnnounced === 'object') {
                return (now - lastAnnounced.time) > COOLDOWN_MS;
            }

            return false; // Already announced recently
        });

        if (newItems.length > 0) {
            const text = `Detected: ${newItems.join(', ')}`;

            // Only speak if not currently speaking
            if (!window.speechSynthesis.speaking) {
                speakResponse(text);

                // Update with timestamps
                const newEntries = newItems.map(label => ({ label, time: now }));
                setLastAnnouncedLabels(prev => {
                    // Remove old entries for the same labels
                    const filtered = prev.filter(item =>
                        !newItems.includes(typeof item === 'object' ? item.label : item)
                    );
                    // Add new entries and keep last 20
                    return [...filtered, ...newEntries].slice(-20);
                });
            }
        }
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[70vh] flex flex-col z-30 pointer-events-none">

            <AnimatePresence>
                {isVisionMode && (
                    <VisionHUD
                        onClose={() => setIsVisionMode(false)}
                        onDetect={handleVisionDetect}
                    />
                )}
                {showWeather && <WeatherWidget onClose={() => setShowWeather(false)} />}
                {showNews && <NewsFeed onClose={() => setShowNews(false)} />}
                {showClock && <DigitalClock onClose={() => setShowClock(false)} />}
            </AnimatePresence>

            {/* Scrollable Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar pointer-events-auto">
                <div className="flex flex-col gap-6">
                    <AnimatePresence mode='popLayout'>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}
                            >
                                <div className={`relative max-w-[85%] px-6 py-4 rounded-xl border backdrop-blur-md transition-all ${msg.role === 'user'
                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                    : 'bg-black/60 border-cyan-400/50 text-cyan-100 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                                    }`}>
                                    <div className="font-orbitron text-[10px] uppercase tracking-widest opacity-50 mb-2 flex justify-between items-center">
                                        <span>{msg.role === 'user' ? 'AUTH_USER' : 'NEXORA_CORE'}</span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(msg.content, msg.id)}
                                                className="p-1 hover:text-cyan-400 transition-colors"
                                                title="Copy"
                                            >
                                                {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                            {msg.role === 'user' && (
                                                <button
                                                    onClick={() => handleEdit(msg.content)}
                                                    className="p-1 hover:text-cyan-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                        </div>
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
                            type="button"
                            onClick={() => setIsVisionMode(!isVisionMode)}
                            className={`transition-colors ${isVisionMode ? 'text-cyan-400' : 'text-cyan-500/50 hover:text-cyan-400'}`}
                            title="Toggle Vision Mode"
                        >
                            <CameraIcon size={20} />
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
