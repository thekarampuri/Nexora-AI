
import React from 'react';
import { motion } from 'framer-motion';

const FeatureCard = ({ feature, onClick }) => {
    const Icon = feature.icon;

    return (
        <motion.div
            whileHover={{ scale: 1.05, borderColor: 'rgba(0, 243, 255, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="bg-black/40 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-800/50 transition-all group"
        >
            <div className={`p-4 rounded-full bg-gray-900 group-hover:bg-gray-800 transition-colors border border-gray-800 group-hover:border-gray-600 ${feature.color}`}>
                <Icon size={32} />
            </div>
            <div className="text-center">
                <h3 className="font-orbitron text-gray-200 group-hover:text-cyan-400 transition-colors text-lg">{feature.name}</h3>
                <p className="text-xs text-gray-500 mt-1 font-mono">{feature.desc}</p>
            </div>
        </motion.div>
    );
};

export default FeatureCard;
