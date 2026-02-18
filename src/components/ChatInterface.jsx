import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, Mic, MicOff, Volume2, VolumeX, Camera as CameraIcon, Copy, Edit, Check, Square } from 'lucide-react';
import VisionHUD from './VisionHUD';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { parseCommand } from '../utils/commandParser';
import WeatherWidget from './features/WeatherWidget';
import NewsFeed from './features/NewsFeed';
import DigitalClock from './features/DigitalClock';

const ChatInterface = ({ currentSessionId, onSessionSelect }) => {
    const { addLog, toggleDevice, devices } = useApp();
    const { currentUser } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSttSupported, setIsSttSupported] = useState(true);
    const [sttStatus, setSttStatus] = useState('READY');
    const [isVisionMode, setIsVisionMode] = useState(false);
    const [showWeather, setShowWeather] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [showClock, setShowClock] = useState(false);
    const [lastAnnouncedLabels, setLastAnnouncedLabels] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [showStop, setShowStop] = useState(false);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef('');
    const restartTimeoutRef = useRef(null);
    const isListeningRef = useRef(false);
    const isActiveModeRef = useRef(false);
    const silenceTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isProcessingRef = useRef(false);

    // --- FIRESTORE SYNC ---
    useEffect(() => {
        if (!currentUser || !currentSessionId) {
            setMessages([]); // Clear messages if no session or user
            return;
        }

        const q = query(
            collection(db, "users", currentUser.uid, "conversations", currentSessionId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        }, (error) => {
            console.error("Message Sync Error:", error);
        });

        return unsubscribe;
    }, [currentSessionId, currentUser]);
    // ----------------------

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

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsProcessing(false);
            addLog("System: User aborted request.");
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing, streamingMessage]);

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
                isListeningRef.current = true;
                isActiveModeRef.current = true;

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

        const cleanText = text
            .replace(/[*#_>`]/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/SYSTEM_TIME:.*?/g, 'The current system time is ')
            .replace(/STATUS:.*?/g, 'The current system status is ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    };

    // --- 3. Chat Processing (Firestore) ---
    const processCommand = async (cmd) => {
        if (!cmd.trim() || isProcessingRef.current) return;

        const lowerCmd = cmd.toLowerCase();

        // UI Immediate Update
        setIsProcessing(true);
        isProcessingRef.current = true;
        setShowStop(true);
        setStreamingMessage(null);

        setInput("");

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const timeoutId = setTimeout(() => {
            if (abortControllerRef.current) {
                console.warn("Request timed out");
                abortControllerRef.current.abort();
            }
        }, 40000);

        let activeSessionId = currentSessionId;

        try {
            // --- A. NEW SESSION CREATION ---
            if (!activeSessionId) {
                try {
                    const sessionsRef = collection(db, "users", currentUser.uid, "conversations");
                    // 1. Generate Title 
                    let title = cmd.substring(0, 30) + (cmd.length > 30 ? "..." : "");
                    // 2. Create Parent Doc
                    const docRef = await addDoc(sessionsRef, {
                        title, createdAt: serverTimestamp(), lastUpdated: serverTimestamp(), lastMessage: cmd
                    });
                    activeSessionId = docRef.id;
                    onSessionSelect(activeSessionId);
                } catch (e) {
                    console.error("Session Creation Failed:", e);
                    throw new Error("Database Error: Could not create session.");
                }
            } else {
                updateDoc(doc(db, "users", currentUser.uid, "conversations", activeSessionId), {
                    lastMessage: cmd, lastUpdated: serverTimestamp()
                }).catch(console.error);
            }

            // --- B. SAVE USER MESSAGE ---
            await addDoc(collection(db, "users", currentUser.uid, "conversations", activeSessionId, "messages"), {
                role: 'user', content: cmd, timestamp: serverTimestamp()
            });

            // --- C. COMMAND PROCESSING ---
            const command = parseCommand(cmd);
            let reply = "";
            let action = "";

            if (command) {
                const PYTHON_API = 'http://localhost:5001';
                const defaultHeaders = { 'Content-Type': 'application/json' };

                if (command.type === 'ui') {
                    if (command.component === 'weather') { setShowWeather(true); reply = "Displaying atmospheric data."; }
                    if (command.component === 'news') { setShowNews(true); reply = "Accessing global news feed."; }
                    if (command.component === 'clock') { setShowClock(true); reply = "Synchronizing time."; }
                    action = `UI: Show ${command.component}`;
                }
                else if (['system', 'media', 'app'].includes(command.type)) {
                    const endpoint = command.type === 'app' ? '/api/app/launch' : '/api/system/command';
                    const body = command.type === 'app' ? { app_name: command.app_name } : { action: command.action };
                    await fetch(`${PYTHON_API}${endpoint}`, { method: 'POST', headers: defaultHeaders, body: JSON.stringify(body), signal });
                    reply = `${command.type.toUpperCase()}: ${command.action || command.app_name} executed.`;
                }
                else if (command.type === 'web') {
                    await fetch(`${PYTHON_API}/api/web/open`, { method: 'POST', headers: defaultHeaders, body: JSON.stringify({ url: command.url }), signal });
                    reply = `Opening ${command.url}...`;
                }
                else if (command.type === 'automation') {
                    try {
                        const endpoint = `${PYTHON_API}/api/automation/${command.service}`;
                        await fetch(endpoint, { method: 'POST', headers: defaultHeaders, body: JSON.stringify(command), signal });
                        reply = `Executing ${command.service} automation: ${command.action}`;
                    } catch (e) { if (e.name !== 'AbortError') reply = "Automation failed."; }
                }
                else if (['file', 'editor'].includes(command.type)) {
                    const endpoint = command.type === 'file' ? '/api/system/file' : '/api/automation/editor';
                    await fetch(`${PYTHON_API}${endpoint}`, { method: 'POST', headers: defaultHeaders, body: JSON.stringify(command), signal });
                    reply = `Operation executing...`;
                }
                if (reply) action = `Command: ${command.type}`;
            }

            // Local Regex Fallbacks
            if (!reply && /^\b(hello|hi|hey)\b/i.test(lowerCmd)) {
                reply = `GOOD_SESSION, ${currentUser?.email || 'ADMIN'}. NEXORA_STATUS: CALIBRATED.`;
                action = "Local: Greeting";
            }

            // --- D. AI STREAMING OR FALLBACK ---
            if (reply) {
                // Save locally generated reply immediately
                await addDoc(collection(db, "users", currentUser.uid, "conversations", activeSessionId, "messages"), {
                    role: 'assistant', content: reply, timestamp: serverTimestamp()
                });
                speakResponse(reply);
                addLog(action);
            }
            else {
                // START STREAMING
                const response = await fetch('http://localhost:5000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: cmd }),
                    signal
                });

                if (!response.ok) throw new Error("AI Stream Connection Failed");
                if (!response.body) throw new Error("ReadableStream not supported.");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedText = "";

                // Initialize streaming message
                setStreamingMessage("▋");
                // speakResponse("Processing..."); // Optional: Speak start

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedText += chunk;
                    setStreamingMessage(accumulatedText + "▋");
                    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                }

                reply = accumulatedText;
                setStreamingMessage(null); // Clear streaming UI

                // Save FINAL Message to Firestore
                await addDoc(collection(db, "users", currentUser.uid, "conversations", activeSessionId, "messages"), {
                    role: 'assistant', content: reply, timestamp: serverTimestamp()
                });

                updateDoc(doc(db, "users", currentUser.uid, "conversations", activeSessionId), {
                    lastMessage: reply, lastUpdated: serverTimestamp()
                }).catch(console.error);

                speakResponse(reply);
                addLog("Gemini: Stream Complete");
            }

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name !== 'AbortError') {
                console.error("Processing Error:", error);
                const errReply = `ERROR: ${error.message || "Unknown Failure"}.`;
                try {
                    await addDoc(collection(db, "users", currentUser.uid, "conversations", currentSessionId, "messages"), {
                        role: 'assistant', content: errReply, timestamp: serverTimestamp()
                    });
                } catch (e) { }
                speakResponse("System error encountered.");
            }
        } finally {
            clearTimeout(timeoutId);
            if (abortControllerRef.current && abortControllerRef.current.signal === signal) {
                abortControllerRef.current = null;
            }
            setIsProcessing(false);
            isProcessingRef.current = false;
            setShowStop(false);
            setStreamingMessage(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Handle logic for stopping or submitting
        if (isProcessing) {
            handleStop();
        } else {
            if (!input.trim()) return;
            processCommand(input);
            setInput('');
        }
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

                    {/* STREAMING MESSAGE INDICATOR/CONTENT */}
                    {streamingMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start relative group"
                        >
                            <div className="relative max-w-[85%] px-6 py-4 rounded-xl border backdrop-blur-md transition-all bg-black/60 border-cyan-400/50 text-cyan-100 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                                <div className="font-orbitron text-[10px] uppercase tracking-widest opacity-50 mb-2">
                                    NEXORA_CORE (PROCESSING...)
                                </div>
                                <div className="prose prose-invert prose-cyan max-w-none">
                                    <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {isProcessing && !streamingMessage && (
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
                        disabled={isProcessing && false} // Keep input enabled for editing if needed, but usually block
                        readOnly={isProcessing} // Make it readonly instead
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
                            disabled={(!input.trim() && !isProcessing) || isListening}
                            className={`${isProcessing ? 'text-red-500 hover:text-red-400' : 'text-cyan-500/50 hover:text-cyan-400'} transition-colors disabled:opacity-30`}
                            title={isProcessing ? "Stop Generating" : "Send"}
                        >
                            {isProcessing ? <Square fill="currentColor" size={20} /> : <Send size={24} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
