import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { GoogleGenerativeAI } from "@google/generative-ai";

const ChatInterface = () => {
    const { addLog, toggleDevice, devices, user } = useApp();
    const [input, setInput] = useState('');
    const [response, setResponse] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef(null);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are 'NEXORA', an advanced AI core for a futuristic HUD system. Your responses should be concise, technical, and system-like. Avoid being human-level conversational. Use terms like 'Command processed', 'Data retrieved', 'Protocol engaged'. You are integrated into a system that controls a classroom light and a lab fan. You can also provide time/date and open google. If the user asks to turn on/off devices, acknowledge concisely."
    });

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const processCommand = async (cmd) => {
        const lowerCmd = cmd.toLowerCase();
        setIsProcessing(true);
        setResponse(null); // Clear previous response

        let reply = "";
        let action = "";

        // 1. PRIORITIZE LOCAL SIMULATED COMMANDS (High efficiency / Offline-first feel)

        // TIME / DATE
        if (lowerCmd.includes('time') || lowerCmd.includes('date')) {
            reply = `SYSTEM_TIME: ${new Date().toLocaleString()}`;
            action = "Local: Time check";
        }
        // OPEN GOOGLE
        else if (lowerCmd.includes('open google') || lowerCmd.includes('search google')) {
            reply = "REDIRECT_SEQUENCE: Initializing Google Search Grid...";
            window.open('https://google.com', '_blank');
            action = "Local: Opened Google";
        }
        // TURN ON DEVICES
        else if (lowerCmd.includes('turn on') || lowerCmd.includes('switch on')) {
            if (lowerCmd.includes('light')) {
                toggleDevice('classroomLight', true);
                reply = "ACCESS_GRANT: Classroom illumination enabled.";
                action = "Local: Light ON";
            } else if (lowerCmd.includes('fan')) {
                toggleDevice('labFan', true);
                reply = "ACCESS_GRANT: Lab ventilation systems engaged.";
                action = "Local: Fan ON";
            }
        }
        // TURN OFF DEVICES
        else if (lowerCmd.includes('turn off') || lowerCmd.includes('switch off')) {
            if (lowerCmd.includes('light')) {
                toggleDevice('classroomLight', false);
                reply = "ACCESS_GRANT: Classroom illumination disabled.";
                action = "Local: Light OFF";
            } else if (lowerCmd.includes('fan')) {
                toggleDevice('labFan', false);
                reply = "ACCESS_GRANT: Lab ventilation systems disengaged.";
                action = "Local: Fan OFF";
            }
        }
        // STATUS
        else if (lowerCmd.includes('status') || lowerCmd.includes('report')) {
            reply = `STATUS_QUERY: Light [${devices.classroomLight ? 'ACTIVE' : 'OFFLINE'}] | Fan [${devices.labFan ? 'ACTIVE' : 'OFFLINE'}]`;
            action = "Local: Status Report";
        }

        // 2. IF NO LOCAL ACTION MATCHED OR IF IT'S A GENERAL QUERY, USE GEMINI
        if (!reply) {
            try {
                const result = await model.generateContent(cmd);
                reply = result.response.text();
                action = "Gemini: AI Brain Response";
            } catch (error) {
                console.error("Gemini Error:", error);
                reply = "ERROR: Connection to AI core severed. Using fallback logic.";
                action = "Error: Gemini Failed";
            }
        }

        setResponse(reply);
        addLog(action);
        setIsProcessing(false);

        // Clear response after a few seconds
        setTimeout(() => setResponse(null), 8000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        processCommand(input);
        setInput('');
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl text-center z-30">

            {/* AI Response Area */}
            <div className="h-24 flex items-center justify-center mb-8">
                <AnimatePresence mode='wait'>
                    {response && (
                        <motion.div
                            key={response}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="bg-black/60 backdrop-blur-md border px-6 py-4 rounded-xl border-cyan-400/50 shadow-[0_0_30px_rgba(0,243,255,0.3)]"
                        >
                            <p className="text-cyan-100 font-orbitron tracking-wide text-lg typing-effect">{response}</p>
                        </motion.div>
                    )}
                    {isProcessing && !response && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-2"
                        >
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></span>
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-300"></span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Field */}
            <form onSubmit={handleSubmit} className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Talk to NEXORA..."
                    className="w-full bg-black/20 backdrop-blur-sm border-b-2 border-cyan-500/50 py-4 px-6 text-xl text-center text-cyan-50 font-orbitron focus:outline-none focus:border-cyan-400 focus:bg-black/40 transition-all placeholder-cyan-500/30"
                />

                {/* Decorative corner brackets or lines */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

                {/* Send Button (Hidden but usable) */}
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/50 hover:text-cyan-400 transition-colors">
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;
