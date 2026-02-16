import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock } from 'lucide-react';

const DigitalClock = ({ onClose }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
            >
                <div className="relative bg-black border border-cyan-500/50 p-12 rounded-2xl shadow-[0_0_100px_rgba(0,243,255,0.2)] max-w-2xl w-full text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="mb-2 text-cyan-500 font-mono tracking-[0.3em] text-sm animate-pulse flex items-center justify-center gap-2">
                        <Clock size={14} /> SYSTEM TIME
                    </div>

                    <div className="font-orbitron font-bold text-7xl md:text-9xl text-white tracking-wider mb-4 drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]">
                        {formatTime(time)}
                    </div>

                    <div className="text-cyan-400 font-mono text-xl md:text-2xl mt-4 border-t border-cyan-500/30 pt-4 inline-block px-12">
                        {formatDate(time)}
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DigitalClock;
