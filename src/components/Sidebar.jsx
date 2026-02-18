import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Plus, Trash2, Edit2, X, Check, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ currentSessionId, onSessionSelect, isMobileOpen, setIsMobileOpen }) => {
    const { currentUser } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // --- 1. FETCH CONVERSATIONS ---
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "users", currentUser.uid, "conversations"),
            orderBy("lastUpdated", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sess = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSessions(sess);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching sessions:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    // --- 2. ACTIONS ---
    const handleNewChat = () => {
        onSessionSelect(null); // Set to null to indicate "New Chat" state
        if (window.innerWidth < 768) setIsMobileOpen(false);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this conversation?")) return;

        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "conversations", id));
            if (currentSessionId === id) onSessionSelect(null);
        } catch (err) {
            console.error("Error deleting chat:", err);
        }
    };

    const startEdit = (e, session) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    const saveEdit = async (e) => {
        e.stopPropagation();
        if (!editTitle.trim()) return;

        try {
            await updateDoc(doc(db, "users", currentUser.uid, "conversations", editingId), {
                title: editTitle.trim()
            });
            setEditingId(null);
        } catch (err) {
            console.error("Error updating title:", err);
        }
    };

    const cancelEdit = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };


    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-black/90 border-r border-cyan-500/20 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full p-4">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-cyan-400 font-orbitron tracking-widest flex items-center gap-2">
                            <MessageSquare size={18} /> HISTORY
                        </h2>
                        <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-cyan-500">
                            <X size={24} />
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 py-3 rounded-lg flex items-center justify-center gap-2 transition-all mb-4 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span>NEW SESSION</span>
                    </button>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {loading ? (
                            <div className="text-cyan-500/40 text-center mt-10 text-sm animate-pulse">SYNCING DATA...</div>
                        ) : sessions.length === 0 ? (
                            <div className="text-cyan-500/30 text-center mt-10 text-xs">NO ARCHIVED LOGS</div>
                        ) : (
                            <AnimatePresence>
                                {sessions.map((session) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onClick={() => {
                                            onSessionSelect(session.id);
                                            if (window.innerWidth < 768) setIsMobileOpen(false);
                                        }}
                                        className={`group relative p-3 rounded-lg cursor-pointer border transition-all ${currentSessionId === session.id
                                                ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-100 shadow-[0_0_10px_rgba(0,243,255,0.1)]'
                                                : 'bg-transparent border-transparent text-cyan-500/60 hover:bg-white/5 hover:text-cyan-400'
                                            }`}
                                    >
                                        {editingId === session.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    className="bg-black/50 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-50 w-full focus:outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                                                <button onClick={cancelEdit} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="truncate pr-8">
                                                    <h3 className="text-sm font-medium truncate">{session.title || "New Conversation"}</h3>
                                                    <p className="text-[10px] opacity-60 truncate">{session.lastMessage || "..."}</p>
                                                </div>

                                                <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-black/80 rounded">
                                                    <button onClick={(e) => startEdit(e, session)} className="p-1 text-cyan-400 hover:text-white"><Edit2 size={12} /></button>
                                                    <button onClick={(e) => handleDelete(e, session.id)} className="p-1 text-red-400 hover:text-white"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-cyan-500/20 text-[10px] text-center text-cyan-900">
                        SECURE • ENCRYPTED • V1.0
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
