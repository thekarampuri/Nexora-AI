import React, { useState } from 'react';
import Navbar from './Navbar';
import ChatInterface from './ChatInterface';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Settings, LayoutDashboard, FileText, Zap, Menu, LogOut } from 'lucide-react';
import LightPillar from './LightPillar';
import SmartDevices from './SmartDevices';
import Logs from './Logs';
// import SettingsPanel from './SettingsPanel';


const HUD = () => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop? Or closed? ChatGPT defaults open on large screens usually.

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black flex">

            {/* 1. Background Layer (LightPillar) */}
            <div className="absolute inset-0 z-0">
                <LightPillar
                    className="w-full h-full"
                    topColor="#5227FF"
                    bottomColor="#FF9FFC"
                    intensity={1.0}
                    rotationSpeed={0.3}
                    glowAmount={0.002}
                    pillarWidth={3.0}
                    pillarHeight={0.4}
                    noiseIntensity={0.5}
                    pillarRotation={25}
                    interactive={false}
                    mixBlendMode="screen"
                    quality="high"
                />
            </div>

            {/* 2. Sidebar (Chat History) */}
            <Sidebar
                currentSessionId={currentSessionId}
                onSessionSelect={setCurrentSessionId}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            {/* 3. Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col h-full w-full overflow-hidden">

                {/* Top Header / Status Bar */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-40 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        {/* Sidebar Toggle Button */}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-cyan-400 hover:text-white transition-colors">
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
                    {activeTab === 'settings' && <SettingsPanel />}
                </div>

                {/* Bottom Navigation - REMOVED per user request */}
                {/* <Navbar activeTab={activeTab} setActiveTab={setActiveTab} /> */}


            </div>

        </div>
    );
};

export default HUD;
