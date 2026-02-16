import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Wind, Droplets, MapPin, X } from 'lucide-react';

const WeatherWidget = ({ onClose }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Using wttr.in as in NURA (Solapur default, or auto)
                const response = await fetch('https://wttr.in/Solapur?format=j1');
                const data = await response.json();

                const current = data.current_condition[0];
                setWeather({
                    temp: current.temp_C,
                    desc: current.weatherDesc[0].value,
                    humidity: current.humidity,
                    wind: current.windspeedKmph,
                    city: 'Solapur, IN' // Hardcoded to match NURA preference
                });
            } catch (err) {
                console.error("Weather fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-24 right-6 bg-black/80 backdrop-blur-md border border-cyan-500/30 p-6 rounded-lg w-80 shadow-[0_0_30px_rgba(0,243,255,0.1)] z-50 font-orbitron text-cyan-50 pointer-events-auto"
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                        <Cloud size={20} /> WEATHER
                    </h3>
                    <button onClick={onClose} className="hover:text-red-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="h-32 flex items-center justify-center text-cyan-500/50 animate-pulse">
                        SCANNING ATMOSPHERE...
                    </div>
                ) : weather ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-cyan-400">
                                {weather.temp}°
                            </div>
                            <div className="text-right">
                                <p className="text-cyan-300 text-sm">{weather.desc}</p>
                                <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                    <MapPin size={10} /> {weather.city}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="bg-cyan-900/20 p-2 rounded flex items-center gap-2 text-sm border border-cyan-500/10">
                                <Wind size={14} className="text-cyan-400" />
                                {weather.wind} km/h
                            </div>
                            <div className="bg-cyan-900/20 p-2 rounded flex items-center gap-2 text-sm border border-cyan-500/10">
                                <Droplets size={14} className="text-cyan-400" />
                                {weather.humidity}%
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-red-400 text-center">DATA STREAM FAILED</div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default WeatherWidget;
