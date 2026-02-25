// src/components/AutomationToast.jsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Mail, Music, Globe, File, Clock, Monitor, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const getCategoryConfig = (category) => {
    switch (category) {
        case 'WHATSAPP': return { icon: Bot, border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' };
        case 'MAIL': return { icon: Mail, border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' };
        case 'MUSIC': return { icon: Music, border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' };
        case 'SYSTEM': return { icon: Monitor, border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' };
        case 'FILE': return { icon: File, border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' };
        case 'SEARCH': return { icon: Search, border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
        case 'BROWSER': return { icon: Globe, border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
        case 'REMINDER': return { icon: Clock, border: 'border-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-400' };
        default: return { icon: Zap, border: 'border-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-400' };
    }
};

const AutomationToast = ({ id, tag, label, status, onDismiss }) => {
    const config = getCategoryConfig(tag?.category);
    const Icon = config.icon;

    useEffect(() => {
        if (status === 'success' || status === 'error') {
            const timer = setTimeout(() => {
                onDismiss(id);
            }, 3500); // 3.5 seconds auto-dismiss
            return () => clearTimeout(timer);
        }
    }, [status, id, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 p-3 min-w-[280px] max-w-sm w-max pointer-events-auto
                        bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl 
                        border-l-4 ${config.border} border-y border-r border-gray-800`}
        >
            {/* Left Icon Area */}
            <div className={`p-2 rounded-lg ${config.bg} ${config.text} shrink-0`}>
                <Icon size={18} />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium text-gray-200 truncate" title={label}>
                    {label}
                </p>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-0.5">
                    {tag?.category} • {tag?.action}
                </p>
            </div>

            {/* Status Area */}
            <div className="shrink-0 flex items-center justify-center w-6 h-6">
                <AnimatePresence mode="wait">
                    {status === 'pending' && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Loader2 size={16} className="text-cyan-400 animate-spin" />
                        </motion.div>
                    )}
                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <CheckCircle2 size={18} className="text-green-400" />
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <XCircle size={18} className="text-red-400" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background shimmer effect while pending */}
            {status === 'pending' && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                                -translate-x-full animate-[shimmer_2s_infinite]" />
            )}
        </motion.div>
    );
};

export default AutomationToast;
