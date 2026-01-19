import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Bot, User, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const { login } = useApp();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            login(username);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8 bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.1)]"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-400/50 mb-4 shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                        <Bot size={48} className="text-cyan-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-orbitron tracking-wider">
                        NEXORA AI
                    </h1>
                    <p className="text-cyan-400/60 text-sm mt-2 tracking-[0.2em]">SECURE ACCESS TERMINAL</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-cyan-400/80 text-xs uppercase tracking-wider ml-1">Identity</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/50 border border-cyan-500/30 rounded-lg py-3 px-12 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all placeholder-cyan-500/20"
                                placeholder="ENTER USERNAME"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-cyan-400/80 text-xs uppercase tracking-wider ml-1">Passcode</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-cyan-500/30 rounded-lg py-3 px-12 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all placeholder-cyan-500/20"
                                placeholder="ENTER PASSCODE"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold py-3 rounded-lg hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>INITIALIZE SESSION</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
