import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Bot, User, Lock, ArrowRight, AlertCircle, Chrome } from 'lucide-react';

const Login = () => {
    const { login, signup, googleSignIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!email.trim() || !password.trim()) {
            setError("CREDENTIALS_REQUIRED");
            setLoading(false);
            return;
        }

        try {
            if (isLoginView) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (err) {
            setError(err.message.replace("Firebase:", "").trim());
        }
        setLoading(false);
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            await googleSignIn();
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
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
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-400/50 mb-4 shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                        <Bot size={48} className="text-cyan-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-orbitron tracking-wider">
                        NEXORA AI
                    </h1>
                    <p className="text-cyan-400/60 text-xs mt-2 tracking-[0.2em]">SECURE ACCESS TERMINAL</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/40 p-3 rounded-lg mb-6 flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-cyan-400/80 text-xs uppercase tracking-wider ml-1">Identity Protocol (Email)</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-cyan-500/30 rounded-lg py-3 px-12 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all placeholder-cyan-500/20"
                                placeholder="ENTER EMAIL"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-cyan-400/80 text-xs uppercase tracking-wider ml-1">Security Key (Password)</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-cyan-500/30 rounded-lg py-3 px-12 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all placeholder-cyan-500/20"
                                placeholder="ENTER PASSWORD"
                                required
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>{loading ? "AUTHENTICATING..." : (isLoginView ? "INITIALIZE SESSION" : "REGISTER UNIT")}</span>
                        {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>

                    <div className="flex items-center gap-4 my-2">
                        <div className="h-px bg-cyan-900 flex-1"></div>
                        <span className="text-cyan-700 text-xs">OR</span>
                        <div className="h-px bg-cyan-900 flex-1"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={loading}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-100 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Chrome size={18} />
                        GOOGLE AUTHENTICATION
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="text-cyan-500 hover:text-cyan-300 text-xs tracking-widest uppercase hover:underline underline-offset-4 transition-all"
                    >
                        {isLoginView ? "Switch to Registration Protocol" : "Back to Login Sequence"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
