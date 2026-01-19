import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

const Logs = () => {
    const { logs } = useApp();

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-24 left-6 w-80 h-64 bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,243,255,0.1)]"
        >
            <div className="flex items-center gap-2 p-3 border-b border-cyan-500/20 bg-cyan-500/5">
                <Terminal size={14} className="text-cyan-400" />
                <span className="text-xs font-orbitron text-cyan-400 tracking-wider">SYSTEM LOGS</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[10px]">
                {logs.length === 0 && (
                    <div className="text-cyan-500/30 italic text-center mt-10">No recent activity detected.</div>
                )}

                {logs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                        <span className="text-cyan-700">[{log.time}]</span>
                        <span className="text-cyan-100/80">{log.text}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default Logs;
