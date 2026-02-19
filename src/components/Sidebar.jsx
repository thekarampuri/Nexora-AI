
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Plus, Trash2, Edit2, Check, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ currentSessionId, onSessionSelect, isOpen, setIsOpen }) => {
    const { currentUser } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // --- FETCH CONVERSATIONS ---
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, "users", currentUser.uid, "conversations"),
            orderBy("lastUpdated", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, [currentUser]);

    // --- ACTIONS ---
    const handleNewChat = () => { onSessionSelect(null); if (window.innerWidth < 768) setIsOpen(false); };
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete?")) return;
        await deleteDoc(doc(db, "users", currentUser.uid, "conversations", id));
        if (currentSessionId === id) onSessionSelect(null);
    };
    const startEdit = (e, session) => { e.stopPropagation(); setEditingId(session.id); setEditTitle(session.title); };
    const saveEdit = async (e) => {
        e.stopPropagation();
        if (editTitle.trim()) await updateDoc(doc(db, "users", currentUser.uid, "conversations", editingId), { title: editTitle.trim() });
        setEditingId(null);
    };

    return (
        <>
            {/* Sidebar Container */}
            <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: isOpen ? 260 : 0, opacity: isOpen ? 1 : 0 }}
                className="h-full bg-black border-r border-gray-800 flex flex-col overflow-hidden whitespace-nowrap"
            >
                <div className="p-4 flex flex-col h-full w-[260px]"> {/* Fixed width inner container to prevent text squash */}

                    {/* New Chat */}
                    <button onClick={handleNewChat} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-900/20 border border-cyan-800 hover:bg-cyan-900/50 hover:border-cyan-500 text-cyan-100 transition-all text-sm mb-4 cursor-pointer shadow-sm">
                        <Plus size={18} /> <span className="font-medium">New Chat</span>
                    </button>

                    {/* History */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                        <div className="px-2 text-xs font-semibold text-gray-500 mb-2">Recent</div>
                        {loading ? (
                            <div className="text-center text-gray-600 text-xs py-4">Loading...</div>
                        ) : (
                            <AnimatePresence>
                                {sessions.map(session => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => { onSessionSelect(session.id); if (window.innerWidth < 768) setIsOpen(false); }}
                                        className={`group relative flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer text-sm transition-colors ${currentSessionId === session.id ? 'bg-gray-800 text-white' : 'hover:bg-gray-900 text-gray-400'
                                            }`}
                                    >
                                        <MessageSquare size={16} />

                                        {editingId === session.id ? (
                                            <div className="flex items-center gap-1 flex-1">
                                                <input
                                                    autoFocus
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="bg-gray-700 text-white rounded px-1 py-0.5 w-full text-xs focus:outline-none"
                                                />
                                                <Check size={14} className="hover:text-green-400" onClick={saveEdit} />
                                            </div>
                                        ) : (
                                            <span className="truncate flex-1">{session.title || "New Chat"}</span>
                                        )}

                                        {/* Hover Actions */}
                                        {currentSessionId === session.id && !editingId && (
                                            <div className="absolute right-2 flex items-center bg-gray-800 pl-2 shadow-[-10px_0_10px_#1f2937]"> // Gradient fade effect
                                                <Edit2 size={14} className="text-gray-400 hover:text-white mr-2" onClick={(e) => startEdit(e, session)} />
                                                <Trash2 size={14} className="text-gray-400 hover:text-red-400" onClick={(e) => handleDelete(e, session.id)} />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Footer / User Profile */}
                    <div className="border-t border-gray-800 pt-4 mt-2 flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded bg-cyan-900 flex items-center justify-center text-cyan-200 font-bold text-xs">
                            {currentUser?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium text-gray-200 truncate">{currentUser?.email}</div>
                            <div className="text-xs text-gray-500">Free Plan</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;

