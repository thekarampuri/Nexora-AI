import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Newspaper, ExternalLink } from 'lucide-react';

const NewsFeed = ({ onClose }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch('http://localhost:5001/api/news');
                const data = await response.json();
                if (Array.isArray(data)) {
                    setNews(data);
                }
            } catch (err) {
                console.error("News fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md pointer-events-auto"
            >
                <div className="relative bg-gray-900 border border-cyan-500/30 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,243,255,0.15)] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-cyan-500/30 flex justify-between items-center bg-black/40">
                        <h3 className="text-2xl font-orbitron text-cyan-400 flex items-center gap-3">
                            <Newspaper size={24} /> GLOBAL NEWS FEED
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-cyan-500/50 gap-4">
                                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                                <span className="font-mono tracking-widest animate-pulse">ACQUIRING DATA STREAMS...</span>
                            </div>
                        ) : news.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {news.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-black/40 border border-cyan-500/20 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-all group hover:bg-cyan-900/10 flex flex-col"
                                    >
                                        <div className="h-48 overflow-hidden relative">
                                            {item.thumbnail ? (
                                                <img
                                                    src={item.thumbnail}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
                                                    <Newspaper size={48} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-2 text-xs text-cyan-500/70 font-mono">
                                                <span>{item.source?.name || 'Unknown Source'}</span>
                                                <span>•</span>
                                                <span>{item.date || 'Recent'}</span>
                                            </div>

                                            <h4 className="text-white font-bold mb-2 line-clamp-3 group-hover:text-cyan-300 transition-colors">
                                                {item.title}
                                            </h4>

                                            <div className="mt-auto pt-4">
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-300 transition-colors font-mono"
                                                >
                                                    READ ARTICLE <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 mt-20">NO NEWS DATA AVAILABLE</div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NewsFeed;
