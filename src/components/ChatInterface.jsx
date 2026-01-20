import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInterface = () => {
    const { addLog, toggleDevice, devices, user } = useApp();
    const [input, setInput] = useState('');
    const [response, setResponse] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const processCommand = async (cmd) => {
        const lowerCmd = cmd.toLowerCase();
        setIsProcessing(true);
        setResponse(null);

        let reply = "";
        let action = "";

        // 1. LOCAL COMMAND HANDLERS
        if (lowerCmd.includes('hello') || lowerCmd.includes('hi')) {
            reply = `GOOD_SESSION, ${user?.username || 'ADMIN'}. NEXORA_STATUS: CALIBRATED.`;
            action = "Local: Greeting";
        }
        else if (lowerCmd.includes('time') || lowerCmd.includes('date')) {
            reply = `SYSTEM_TIME: ${new Date().toLocaleString()}`;
            action = "Local: Time check";
        }
        else if (lowerCmd.includes('open google') || lowerCmd.includes('search google')) {
            reply = "REDIRECT: Initializing Google Search Grid...";
            window.open('https://google.com', '_blank');
            action = "Local: Opened Google";
        }
        else if (lowerCmd.includes('turn on') || lowerCmd.includes('switch on')) {
            if (lowerCmd.includes('light')) {
                toggleDevice('classroomLight', true);
                reply = "ACCESS: Classroom illumination enabled.";
            } else if (lowerCmd.includes('fan')) {
                toggleDevice('labFan', true);
                reply = "ACCESS: Lab ventilation engaged.";
            }
            action = "Local: Device ON";
        }
        else if (lowerCmd.includes('turn off') || lowerCmd.includes('switch off')) {
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

        setResponse(reply);
        addLog(action);
        setIsProcessing(false);

        setTimeout(() => setResponse(null), 12000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        processCommand(input);
        setInput('');
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl text-center z-30">
            <div className="h-24 flex items-center justify-center mb-8">
                <AnimatePresence mode='wait'>
                    {response && (
                        <motion.div
                            key={response}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-black/60 backdrop-blur-md border px-6 py-4 rounded-xl border-cyan-400/50 shadow-[0_0_30px_rgba(0,243,255,0.3)]"
                        >
                            <p className="text-cyan-100 font-orbitron tracking-wide text-lg">{response}</p>
                        </motion.div>
                    )}
                    {isProcessing && !response && (
                        <div className="flex gap-2">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></span>
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-300"></span>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} className="relative group p-4">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="INITIATING_NEURAL_LINK..."
                    className="w-full bg-black/20 backdrop-blur-sm border-b-2 border-cyan-500/50 py-4 px-6 text-xl text-center text-cyan-50 font-orbitron focus:outline-none focus:border-cyan-400 transition-all placeholder-cyan-500/20"
                />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <button type="submit" className="absolute right-10 top-1/2 -translate-y-1/2 text-cyan-500/50 hover:text-cyan-400 transition-colors">
                    <Send size={24} />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;
