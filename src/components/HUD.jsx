import React, { useState } from 'react';
import Navbar from './Navbar';
import ChatInterface from './ChatInterface';
import Sidebar from './Sidebar';
import SmartDevices from './SmartDevices';
import Logs from './Logs';
import { useAuth } from '../context/AuthContext';
import hudVideo from '../assets/hud_bg.mp4';
import { LogOut, Menu } from 'lucide-react';

const HUD = () => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black flex">

            {/* 1. Background Video Layer */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-30"
                >
                    <source src={hudVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/20 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* 2. Sidebar (Chat History) */}
            <Sidebar
                currentSessionId={currentSessionId}
                onSessionSelect={setCurrentSessionId}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* 3. Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col h-full w-full overflow-hidden">

                {/* Top Header / Status Bar */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-40 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        {/* Mobile Menu Button */}
                        <button onClick={() => setIsMobileOpen(true)} className="md:hidden text-cyan-400">
                            <Menu size={24} />
                        </button>

                        <div className="w-10 h-10 border border-cyan-500/50 rounded-full flex items-center justify-center bg-cyan-500/10 animate-pulse hidden md:flex">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#00f3ff]"></div>
                        </div>
                        <div>
                            <h2 className="text-cyan-100 font-orbitron tracking-widest text-lg">NEXORA</h2>
                            <p className="text-[10px] text-cyan-500 uppercase">System Online • v1.0.4</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="text-right hidden md:block">
                            <p className="text-cyan-400 font-mono text-sm">{currentUser?.email || "UNKNOWN"}</p>
                            <p className="text-[10px] text-cyan-600">ADMINISTRATOR_ACCESS</p>
                        </div>
                        <button onClick={logout} className="p-2 border border-cyan-800 rounded hover:bg-cyan-900/40 text-cyan-600 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Content (Chat) */}
                <div className="relative z-10 w-full h-full pt-20 flex flex-col">
                    <ChatInterface
                        currentSessionId={currentSessionId}
                        onSessionSelect={setCurrentSessionId}
                    />
                </div>

                {/* Overlays */}
                <div className="z-20">
                    {activeTab === 'devices' && <SmartDevices />}
                    {activeTab === 'logs' && <Logs />}
                </div>

                {/* Bottom Navigation */}
                <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

        </div>
    );
};

export default HUD;
