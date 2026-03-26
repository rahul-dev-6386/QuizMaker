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
        <div className="assistant-widget-shell">
            {open && (
                <div className="assistant-widget-panel">
                    <div className="assistant-widget-header">
                        <div className="assistant-widget-title">
                            <BotIcon size={16} />
                            <div>
                                <strong>Platform Assistant</strong>
                                <div className="assistant-widget-subtitle">Quiz, reports, attempts, and score insights</div>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                            Close
                        </button>
                    </div>

                    <div className="assistant-widget-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`assistant-widget-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                                {m.text}
                            </div>
                        ))}
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
                                placeholder="Ask about your quizzes, attempts, or reports"
                            />
                            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
                                {loading ? '...' : 'Send'}
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
