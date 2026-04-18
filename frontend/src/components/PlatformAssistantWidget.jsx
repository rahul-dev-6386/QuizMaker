import React, { useMemo, useState } from 'react';
import { chatWithAI } from '../api';
import { BotIcon } from './Icons';

export default function PlatformAssistantWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text:
                'I am Sharthi, your personal platform assistant. Try asking me: how many quizzes are available, what is my best score, or show me my accuracy stats!',
        },
    ]);

    const quickActions = useMemo(
        () => [
            'Available Quizzes?',
            'Latest Scorecard',
            'Overall Accuracy',
            'My Best Score',
        ],
        []
    );

    const askAssistant = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;

        setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
        setInput('');
        setLoading(true);
        try {
            const history = messages.map((m) => ({ role: m.role, text: m.text }));
            const res = await chatWithAI({ message: trimmed, history });
            setMessages((prev) => [...prev, { role: 'bot', text: String(res.data.reply || '') }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    text:
                        err.response?.data?.message ||
                        'Assistant is currently unavailable.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="assistant-widget-shell">
            {open && (
                <div className="assistant-widget-panel">
                    <div className="assistant-widget-header" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', color: '#fff', border: 'none' }}>
                        <div className="assistant-widget-title" style={{ color: '#fff' }}>
                            <BotIcon size={20} />
                            <div>
                                <strong style={{ fontSize: '1rem' }}>Sharthi Assistant</strong>
                                <div className="assistant-widget-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>Your AI-powered quiz guide</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }} onClick={() => setMessages([messages[0]])}>Clear</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={() => setOpen(false)}>✕</button>
                        </div>
                    </div>

                    <div className="assistant-widget-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`assistant-widget-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                                {m.role === 'bot' && <div style={{ marginBottom: '4px', opacity: 0.8 }}><BotIcon size={14} /></div>}
                                {m.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="assistant-widget-bubble bot">
                                <div className="typing-indicator">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="assistant-widget-footer">
                        <div className="assistant-widget-actions">
                            {quickActions.map((q) => (
                                <button key={q} className="assistant-quick-action" onClick={() => askAssistant(q)}>
                                    {q}
                                </button>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                askAssistant(input);
                            }}
                            className="assistant-widget-form"
                        >
                            <input
                                className="form-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Sharthi about your stats..."
                                disabled={loading}
                            />
                            <button className="btn btn-primary btn-sm" type="submit" disabled={loading || !input.trim()}>
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                className="assistant-widget-trigger"
                onClick={() => setOpen((v) => !v)}
                title="Open Assistant"
            >
                <BotIcon size={18} />
            </button>
        </div>
    );
}
