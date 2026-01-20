import React, { useState } from 'react';
import Navbar from './Navbar';
import ChatInterface from './ChatInterface';
import SmartDevices from './SmartDevices';
import Logs from './Logs';
import { useApp } from '../context/AppContext';
import hudVideo from '../assets/hud_bg.mp4';
import { LogOut } from 'lucide-react';

const HUD = () => {
    const { user, logout } = useApp();
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'devices', 'logs', 'settings'

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">

            {/* 1. Background Video Layer */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-100"
                >
                    <source src={hudVideo} type="video/mp4" />
                </video>
                {/* Reduced overlay for brightness */}
                <div className="absolute inset-0 bg-black/20 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* 2. Top Header / Status Bar */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-40">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-cyan-500/50 rounded-full flex items-center justify-center bg-cyan-500/10 animate-pulse">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#00f3ff]"></div>
                    </div>
                    <div>
                        <h2 className="text-cyan-100 font-orbitron tracking-widest text-lg">NEXORA</h2>
                        <p className="text-[10px] text-cyan-500 uppercase">System Online • v1.0.4</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-cyan-400 font-mono text-sm">{user?.username}</p>
                        <p className="text-[10px] text-cyan-600">ADMINISTRATOR_ACCESS</p>
                    </div>
                    <button onClick={logout} className="p-2 border border-cyan-800 rounded hover:bg-cyan-900/40 text-cyan-600 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* 3. Main Content Area */}
            <div className="relative z-10 w-full h-full">
                <ChatInterface />
            </div>

            {/* 4. Overlays (Conditional) */}
            <div className="z-20">
                {activeTab === 'devices' && <SmartDevices />}
                {activeTab === 'logs' && <Logs />}
            </div>

            {/* 5. Bottom Navigation */}
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        </div>
    );
};

export default HUD;
