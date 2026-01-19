import React from 'react';
import { LayoutDashboard, Zap, FileText, Settings } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'devices', icon: Zap, label: 'Devices' },
        { id: 'logs', icon: FileText, label: 'Logs' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(isActive ? 'dashboard' : item.id)} // Toggle off if clicked again? Or just switch. Let's switch.
                            className={`p-3 rounded-xl transition-all duration-300 relative group ${isActive ? 'text-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'text-cyan-600 hover:text-cyan-300'
                                }`}
                        >
                            <Icon size={24} className={isActive ? 'animate-pulse' : ''} />

                            {/* Tooltip */}
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-cyan-500/30">
                                {item.label}
                            </span>

                            {/* Active Indicator */}
                            {isActive && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_#00f3ff]"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Navbar;
