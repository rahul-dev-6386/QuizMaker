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
                'I can help with platform tasks.\nTry: how many quizzes are there, my last scorecard, total attempted questions, my accuracy, my best score, total attempts.',
        },
    ]);

    const quickActions = useMemo(
        () => [
            'how many quizzes are there',
            'my last scorecard',
            'total attempted questions',
            'my accuracy',
            'my best score',
            'total attempts',
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
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 240 }}>
            {open && (
                <div
                    className="card"
                    style={{
                        width: 360,
                        maxWidth: 'calc(100vw - 24px)',
                        marginBottom: '0.75rem',
                        padding: 0,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            padding: '0.75rem 0.9rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BotIcon size={16} />
                            <strong style={{ fontSize: '0.95rem' }}>Assistant</strong>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                            Close
                        </button>
                    </div>

                    <div
                        style={{
                            maxHeight: 330,
                            overflowY: 'auto',
                            padding: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            background: 'var(--bg-base)',
                        }}
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                                    color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                                    borderRadius: 8,
                                    padding: '0.6rem 0.75rem',
                                    fontSize: '0.83rem',
                                    maxWidth: '95%',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'var(--font-base)',
                                }}
                            >
                                {m.text}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '0.7rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.55rem' }}>
                            {quickActions.map((q) => (
                                <button key={q} className="btn btn-ghost btn-sm" onClick={() => askAssistant(q)}>
                                    {q}
                                </button>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                askAssistant(input);
                            }}
                            style={{ display: 'flex', gap: '0.45rem' }}
                        >
                            <input
                                className="form-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask platform task..."
                                style={{ flex: 1, fontSize: '0.85rem' }}
                            />
                            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
                                {loading ? '...' : 'Send'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={() => setOpen((v) => !v)}
                style={{
                    borderRadius: '999px',
                    width: 52,
                    height: 52,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-lg)',
                }}
                title="Open Assistant"
            >
                <BotIcon size={18} />
            </button>
        </div>
    );
}
