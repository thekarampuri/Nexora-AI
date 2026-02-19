
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const SpecializedChat = ({ mode }) => {
    const [messages, setMessages] = useState([
        { role: 'system', text: `System verified. Mode: ${mode.toUpperCase()} active.` }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/features/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, mode: mode })
            });

            if (!response.ok) throw new Error("API Error");

            // Handle Streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiText = "";

            setMessages(prev => [...prev, { role: 'ai', text: "" }]); // Placeholder

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                aiText += chunk;

                // Update last message
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].text = aiText;
                    return newMsgs;
                });
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'system', text: "Error: Connection to AI Core failed." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-lg overflow-hidden border border-gray-700/50">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                                <Bot size={16} className="text-cyan-400" />
                            </div>
                        )}
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                ? 'bg-cyan-900/30 text-cyan-50 border border-cyan-500/30 rounded-tr-none'
                                : msg.role === 'system'
                                    ? 'bg-red-900/30 text-red-200 border border-red-500/30 font-mono text-xs'
                                    : 'bg-gray-800/80 text-gray-200 border border-gray-600/50 rounded-tl-none markdown-body'
                            }`}>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-500">
                                <User size={16} className="text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 bg-black/40 border-t border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${mode.replace('_', ' ')}...`}
                    disabled={loading}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-50"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default SpecializedChat;
