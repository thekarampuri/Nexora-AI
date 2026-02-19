import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, Mic, MicOff, Volume2, VolumeX, Camera as CameraIcon, Copy, Edit, Check, Square, Paperclip, Link as LinkIcon, ChevronDown, Sparkles } from 'lucide-react';
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

    // --- FEATURE STATE ---
    const [mode, setMode] = useState('default');
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const fileInputRef = useRef(null);

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
                setIsListening(true); // Update UI state

                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isActiveModeRef.current) {
                        console.log("STT: Silence timeout - reverting to passive mode");
                        isActiveModeRef.current = false;
                        setInput('');
                        speakResponse("I didn't hear anything.");
                    }
                }, 6000);
            } catch (err) {
                console.error("STT Start Error", err);
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

            // 1. FEATURE MODE (Medical, Code, or File Attachment)
            if (mode !== 'default' || attachment) {
                const fullContent = attachment ? `[CONTEXT: ${attachment.content}]\n\n${cmd}` : cmd;

                // Call Feature Endpoint
                const response = await fetch('http://localhost:5000/api/features/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: fullContent, mode }),
                    signal
                });

                if (!response.ok) throw new Error("Feature Request Failed");

                // Stream setup
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiText = "";
                setStreamingMessage("▋");

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    aiText += decoder.decode(value, { stream: true });
                    setStreamingMessage(aiText + "▋");
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }

                reply = aiText;
                setStreamingMessage(null);
                action = `Mode: ${mode}`;

            } else if (command) {
                // 2. SYSTEM COMMANDS (Only in Default Mode)
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
            if (!reply && /^\b(hello|hi|hey)\b/i.test(lowerCmd) && mode === 'default') {
                reply = `GOOD_SESSION, ${currentUser?.email || 'ADMIN'}. NEXORA_STATUS: CALIBRATED.`;
                action = "Local: Greeting";
            }

            // --- D. AI STREAMING OR FALLBACK (Standard Chat) ---
            if (reply) {
                // ... (Save locally generated reply)
            }
            else {
                // STANDARD AI CHAT
                const response = await fetch('http://localhost:5000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: cmd }),
                    signal
                });

                if (!response.ok) throw new Error("AI Request Failed");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiText = "";
                setStreamingMessage("▋");

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    aiText += decoder.decode(value, { stream: true });
                    setStreamingMessage(aiText + "▋");
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }

                setStreamingMessage(null);

                // Parse Reminders/Timers
                const reminderMatch = aiText.match(/\[(REMINDER|TIMER)\|([^\|]+)\|([^\]]+)\]/);
                if (reminderMatch) {
                    const [_, type, time, msg] = reminderMatch;
                    addLog(`System: Setting ${type} for ${time} - ${msg}`);
                    // In a real app, save to DB or set setTimeout. For demo:
                    if (type === 'TIMER') {
                        const mins = parseInt(time);
                        setTimeout(() => {
                            speakResponse(`Reminder: ${msg}`);
                            alert(`REMINDER: ${msg}`);
                        }, mins * 60000);
                    }
                }

                // Save AI Response
                await addDoc(collection(db, "users", currentUser.uid, "conversations", activeSessionId, "messages"), {
                    role: 'assistant', content: aiText, timestamp: serverTimestamp()
                });

                speakResponse(aiText);
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


    // --- 4. FEATURE & FILE LOGIC ---
    // (State moved to top)


    const MODES = [
        { id: 'default', label: 'Nexora Core', icon: Sparkles, color: 'text-cyan-400' },
        { id: 'medical', label: 'Medical AI', icon: Sparkles, color: 'text-red-400' },
        { id: 'code_explainer', label: 'Code Expert', icon: Sparkles, color: 'text-yellow-400' },
        { id: 'math_solver', label: 'Math Solver', icon: Sparkles, color: 'text-blue-400' },
        { id: 'translator', label: 'Translator', icon: Sparkles, color: 'text-green-400' },
    ];

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual feedback
        setAttachment({ name: file.name, loading: true });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:5000/api/features/upload-pdf', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Upload failed");
            }

            const data = await res.json();
            if (data.text) {
                setAttachment({ type: 'file', name: file.name, content: data.text });
                addLog("System: PDF text extracted.");
            }
        } catch (err) {
            console.error(err);
            setAttachment(null);
            addLog("System: Upload failed.");
        }
    };

    const handleUrlInput = async () => {
        const url = prompt("Enter URL to analyze:");
        if (!url) return;

        setAttachment({ name: url, loading: true });

        try {
            const res = await fetch('http://localhost:5000/api/features/summarize-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.summary) {
                setAttachment({ type: 'url', name: url, content: `[URL Content (Summarized): ${data.summary}]` });
                addLog("System: URL processed.");
            } else {
                throw new Error("No summary returned");
            }
        } catch (err) {
            console.error(err);
            setAttachment(null);
            addLog("System: URL processing failed.");
        }
    };


    return (
        <div className="relative w-full h-full flex flex-col z-10">


            <AnimatePresence>
                {isVisionMode && <VisionHUD onClose={() => setIsVisionMode(false)} onDetect={handleVisionDetect} />}
                {showWeather && <WeatherWidget onClose={() => setShowWeather(false)} />}
                {showNews && <NewsFeed onClose={() => setShowNews(false)} />}
                {showClock && <DigitalClock onClose={() => setShowClock(false)} />}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-20 custom-scrollbar">
                <div className="max-w-3xl mx-auto flex flex-col gap-6">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] px-5 py-3 rounded-2xl ${msg.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-br-none'
                                : 'bg-gray-800/80 text-gray-100 rounded-tl-none border border-gray-700'
                                }`}>
                                {msg.attachment && (
                                    <div className="mb-2 text-xs opacity-70 flex items-center gap-1 bg-black/20 px-2 py-1 rounded w-fit">
                                        <Paperclip size={10} /> {msg.attachment}
                                    </div>
                                )}
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {streamingMessage && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-gray-800/80 text-gray-100 rounded-tl-none border border-gray-700">
                                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="w-full max-w-3xl mx-auto px-4 pb-6">
                <div className="max-w-4xl mx-auto flex items-end gap-3 rounded-xl bg-gray-800/50 p-2 border border-gray-700/50 backdrop-blur-sm">

                    {/* Left Actions */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Mode Selector Trigger */}
                        <button
                            onClick={() => setShowModeMenu(!showModeMenu)}
                            className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${MODES.find(m => m.id === mode)?.color}`}
                            title="Select AI Mode"
                        >
                            <Sparkles size={20} />
                        </button>

                        <button
                            onClick={() => setIsVisionMode(!isVisionMode)}
                            className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${isVisionMode ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-400'}`}
                            title="Toggle Vision"
                        >
                            <CameraIcon size={20} />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${attachment ? 'text-cyan-400' : 'text-gray-400'}`}
                            title="Upload PDF"
                        >
                            <Paperclip size={20} />
                        </button>
                    </div>

                    {/* Input Field */}
                    <div className="flex-1 relative">
                        {attachment && (
                            <div className="absolute -top-10 left-0 bg-gray-800 text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-gray-700">
                                <FileText size={12} className="text-cyan-400" />
                                <span className="text-gray-300 max-w-[150px] truncate">{attachment.name}</span>
                                <button onClick={() => setAttachment(null)} className="hover:text-red-400"><X size={12} /></button>
                            </div>
                        )}

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder={mode === 'default' ? "Message Nexora..." : `Message ${MODES.find(m => m.id === mode)?.label}...`}
                            className="w-full bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none py-3 max-h-32 custom-scrollbar"
                            rows={1}
                            style={{ minHeight: '44px' }} // Fix height
                        />
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Mic */}
                        <button
                            onMouseDown={toggleListening}
                            // onMouseUp={toggleListening} // If push-to-talk desired
                            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500' : 'hover:bg-gray-700 text-gray-400'}`}
                            title="Voice Command"
                        >
                            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>

                        {/* Send */}
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim() && !isListening && !attachment}
                            className={`p-2 rounded-full transition-all ${input.trim() || isListening || attachment ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>
                <div className="text-center text-[10px] text-gray-600 mt-2 font-mono">
                    NEXORA AI CORE V3.0
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;

