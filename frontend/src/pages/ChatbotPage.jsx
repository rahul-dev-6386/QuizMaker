import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../api';

export default function ChatbotPage() {
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Welcome to QuizMaster Support Bot. I can help you with platform tasks like quizzes, attempts, reports, leaderboard and admin actions.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        const updatedMessages = [...messages, { role: 'user', text: userText }];
        setMessages(updatedMessages);
        setInput('');
        setIsTyping(true);

        try {
            // Send the context to the bot, excluding the initial greeting for cleaner history
            const history = updatedMessages.slice(1, -1);

            const res = await chatWithAI({
                message: userText,
                history: history
            });

            setMessages(prev => [...prev, {
                role: 'bot',
                text: res.data.reply
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later."
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '1360px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Platform Chatbot
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Ask for help related to QuizMaster features and workflows.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {['How to start a quiz', 'How to review attempts', 'How to analyze with AI', 'How leaderboard works', 'How to retake quiz'].map((topic) => (
                    <button
                        key={topic}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setInput(topic)}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: '10px' }}>
                {/* Chat Header */}
                <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>QuizMaster Support Bot</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Connected
                        </div>
                    </div>
                </div>

                {/* Chat Messages Area */}
                <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.875rem', background: 'var(--bg-base)' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            maxWidth: '82%',
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            padding: '0.875rem 1rem',
                            borderRadius: '8px',
                            background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                            color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                            borderBottomRightRadius: msg.role === 'user' ? 2 : '8px',
                            borderBottomLeftRadius: msg.role === 'bot' ? 2 : '8px',
                            fontSize: '0.9375rem',
                            lineHeight: 1.55,
                            boxShadow: 'none',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.text}
                        </div>
                    ))}

                    {isTyping && (
                        <div style={{
                            maxWidth: '85%', alignSelf: 'flex-start', padding: '1rem 1.25rem',
                            borderRadius: '8px', background: 'var(--bg-surface)', borderBottomLeftRadius: 2,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--primary)', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Thinking...</span>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ask about QuizMaster platform tasks"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem 0.875rem', fontSize: '0.95rem' }}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isTyping || !input.trim()}
                        style={{ padding: '0.75rem 1.2rem', borderRadius: '8px' }}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
