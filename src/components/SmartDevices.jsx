import React from 'react';
import { useApp } from '../context/AppContext';
import { Lightbulb, Fan, Power } from 'lucide-react';
import { motion } from 'framer-motion';

const SmartDevices = () => {
    const { devices, toggleDevice } = useApp();

    const DeviceCard = ({ id, name, icon: Icon, isOn }) => (
        <div className={`relative p-4 rounded-xl border transition-all duration-300 backdrop-blur-md ${isOn
                ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                : 'bg-black/40 border-cyan-500/10 hover:border-cyan-500/30'
            }`}>
            <div className="flex justify-between items-start mb-3">
                <Icon size={24} className={isOn ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]' : 'text-cyan-800'} />
                <button
                    onClick={() => toggleDevice(id)}
                    className={`p-2 rounded-full transition-all ${isOn ? 'bg-cyan-400 text-black shadow-[0_0_10px_#00f3ff]' : 'bg-transparent text-cyan-700 border border-cyan-800 hover:text-cyan-400 hover:border-cyan-400'
                        }`}
                >
                    <Power size={14} />
                </button>
            </div>
            <div>
                <h3 className="text-cyan-100 font-orbitron text-sm tracking-wide">{name}</h3>
                <p className="text-[10px] text-cyan-500/60 uppercase mt-1">Status: {isOn ? 'Online' : 'Standby'}</p>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 right-6 w-72 md:w-80 grid grid-cols-2 gap-3"
        >
            <DeviceCard
                id="classroomLight"
                name="CLASSROOM LIGHT"
                icon={Lightbulb}
                isOn={devices.classroomLight}
            />
            <DeviceCard
                id="labFan"
                name="LAB VENTILATION"
                icon={Fan}
                isOn={devices.labFan}
            />
        </motion.div>
    );
};

export default SmartDevices;
