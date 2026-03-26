import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../api';
import { BotIcon } from '../components/Icons';

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
        <div className="container chatbot-page-shell">
            <div className="chatbot-page-header">
                <div>
                    <div className="eyebrow" style={{ marginBottom: '0.85rem' }}>Assistant Workspace</div>
                    <h1 className="chatbot-page-title">Platform Chatbot</h1>
                    <p className="chatbot-page-copy">
                        Ask focused questions about QuizMaster workflows, quiz attempts, reports, leaderboard data, and platform usage.
                    </p>
                </div>
                <div className="chatbot-status-card">
                    <BotIcon size={18} />
                    <div>
                        <strong>Assistant online</strong>
                        <div>Ready for platform support questions</div>
                    </div>
                </div>
            </div>

            <div className="chatbot-topic-row">
                {['How to start a quiz', 'How to review attempts', 'How to analyze with AI', 'How leaderboard works', 'How to retake quiz'].map((topic) => (
                    <button
                        key={topic}
                        type="button"
                        className="assistant-quick-action"
                        onClick={() => setInput(topic)}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            <div className="chatbot-page-card">
                <div className="chatbot-page-card-header">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>QuizMaster Support Bot</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Connected
                        </div>
                    </div>
                </div>

                <div className="chatbot-page-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chatbot-page-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                            {msg.text}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="chatbot-page-bubble bot chatbot-page-thinking">
                            <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--primary)', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Thinking...</span>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <form onSubmit={handleSend} className="chatbot-page-form">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ask about QuizMaster platform tasks"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isTyping || !input.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
