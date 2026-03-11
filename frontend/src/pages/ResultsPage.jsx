import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getAttemptReport, getQuizAnalysis } from '../api';
import { BotIcon } from '../components/Icons';
import MathText from '../components/MathText';

function ScoreCircle({ score, total }) {
    const pct = total ? Math.round((score / total) * 100) : 0;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

    return (
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                    cx="70" cy="70" r={radius} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>
                    {pct}%
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>
                    {score} / {total}
                </span>
            </div>
        </div>
    );
}

// Chatbot Component
function AnalysisChatbot({ attemptId }) {
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Ask anything about your quiz performance or concept understanding.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response since backend doesn't have a chat endpoint yet
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "That's a great question! However, this is currently a frontend demonstration of the chatbot interface. To process custom queries about your quiz attempt, continuous backend integration with the Gemini API is required."
            }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="card" style={{ marginTop: '2rem', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BotIcon size={18} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Learning Assistant</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                        Connected
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        maxWidth: '85%',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        padding: '0.875rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                        borderBottomRightRadius: msg.role === 'user' ? 4 : 'var(--radius-lg)',
                        borderBottomLeftRadius: msg.role === 'bot' ? 4 : 'var(--radius-lg)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.6,
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {isTyping && (
                    <div style={{
                        maxWidth: '85%', alignSelf: 'flex-start', padding: '0.875rem 1rem',
                        borderRadius: 'var(--radius-lg)', background: 'var(--bg-subtle)', borderBottomLeftRadius: 4,
                    }}>
                        <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--primary)', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: '0.75rem' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Ask about your test results..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={isTyping || !input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}

export default function ResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { score, total } = location.state || {};
    const [analysis, setAnalysis] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisQuestion, setAnalysisQuestion] = useState('');
    const [reportLoading, setReportLoading] = useState(true);
    const [questionAnalysis, setQuestionAnalysis] = useState({});
    const [questionAnalysisLoading, setQuestionAnalysisLoading] = useState({});
    const [questionAnalysisError, setQuestionAnalysisError] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const res = await getAttemptReport(attemptId);
                setReport(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Could not load attempt report.');
            } finally {
                setReportLoading(false);
            }
        })();
    }, [attemptId]);

    const finalScore = report?.score ?? score ?? 0;
    const finalTotal = report?.total ?? total ?? 0;
    const displayTitle = report?.displayTitle || report?.quiz?.title || 'Quiz';
    const displayTopic = report?.topicLabel || report?.quiz?.category || 'General';
    const pct = finalTotal ? Math.round((finalScore / finalTotal) * 100) : 0;
    const grade = pct >= 90 ? { label: 'Excellent Performance', color: 'var(--success)' }
        : pct >= 70 ? { label: 'Solid Effort', color: 'var(--primary)' }
            : pct >= 50 ? { label: 'Needs Improvement', color: 'var(--warning)' }
                : { label: 'Action Required', color: 'var(--danger)' };

    const fetchAnalysis = async (questionOverride = null) => {
        setLoading(true);
        setError('');
        try {
            const questionToUse =
                questionOverride !== null ? questionOverride : analysisQuestion.trim();
            const res = await getQuizAnalysis(attemptId, questionToUse);
            setAnalysis(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Analysis not available.');
        } finally {
            setLoading(false);
        }
    };

    const analyzeSingleQuestion = async (questionId, questionText) => {
        setQuestionAnalysisLoading((prev) => ({ ...prev, [questionId]: true }));
        setQuestionAnalysisError((prev) => ({ ...prev, [questionId]: '' }));
        try {
            const prompt = `Analyze this question in concise format:
Question: "${questionText}".
Explain why answers could be wrong, the key concept, and a short memory tip.`;
            const res = await getQuizAnalysis(attemptId, prompt, questionId);
            setQuestionAnalysis((prev) => ({
                ...prev,
                [questionId]: res.data?.explanation || 'No analysis available.',
            }));
        } catch (err) {
            setQuestionAnalysisError((prev) => ({
                ...prev,
                [questionId]: err.response?.data?.message || 'Analysis not available for this question.',
            }));
        } finally {
            setQuestionAnalysisLoading((prev) => ({ ...prev, [questionId]: false }));
        }
    };

    if (reportLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '1360px' }}>
            <div
                className="card"
                style={{
                    marginBottom: '1.25rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Assessment
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{displayTitle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{displayTopic}</span>
                    {report?.submittedAt && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {new Date(report.submittedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* Score Card */}
            <div className="card" style={{
                textAlign: 'center', marginBottom: '2rem',
                padding: '3rem 2rem', borderTop: `4px solid ${grade.color}`
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <ScoreCircle score={finalScore} total={finalTotal} />
                </div>
                <h1 style={{
                    fontSize: '1.5rem', fontWeight: 700,
                    color: 'var(--text-primary)', marginBottom: '0.5rem',
                }}>
                    {grade.label}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
                    Final Score: <strong style={{ color: 'var(--text-primary)' }}>{finalScore}</strong> out of <strong style={{ color: 'var(--text-primary)' }}>{finalTotal}</strong>
                </p>

                {/* Quick Stats */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                    padding: '1.5rem 0', borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)', marginBottom: '2rem',
                }}>
                    {[
                        { label: 'Correct Responses', value: finalScore, color: 'var(--success)' },
                        { label: 'Missed Items', value: finalTotal - finalScore, color: 'var(--danger)' },
                        { label: 'Accuracy Rate', value: `${pct}%`, color: 'var(--text-primary)' },
                    ].map((s) => (
                        <div key={s.label}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem', fontWeight: 600 }}>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/quizzes')}>
                        Return to Library
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                        View Dashboard
                    </button>
                </div>
            </div>

            {/* Detailed Question Report */}
            {report?.questions?.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
                        Detailed Report
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {report.questions.map((q, index) => (
                            <div key={q.questionId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                                    <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                                        {index + 1}. <MathText text={q.question} />
                                    </p>
                                    <span className={`badge ${q.isCorrect ? 'badge-success' : 'badge-danger'}`}>
                                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                </div>
                                {q.questionImage && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <img
                                            src={q.questionImage}
                                            alt="Question visual"
                                            style={{
                                                width: '100%',
                                                maxHeight: '280px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-surface)',
                                            }}
                                        />
                                    </div>
                                )}
                                <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    {q.options.map((opt) => {
                                        const isCorrect = opt.id === q.correctOptionId;
                                        const isSelected = opt.id === q.selectedOptionId;
                                        return (
                                            <div
                                                key={opt.id}
                                                style={{
                                                    padding: '0.625rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: `1px solid ${isCorrect ? 'var(--success)' : isSelected ? 'var(--warning)' : 'var(--border)'}`,
                                                    background: isCorrect ? 'var(--success-bg)' : isSelected ? 'var(--warning-bg)' : 'var(--bg-surface)',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                <MathText text={opt.text} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Your answer: <strong>{q.selectedOptionText}</strong>
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Correct: <strong>{q.correctOptionText}</strong>
                                    </span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => analyzeSingleQuestion(q.questionId, q.question)}
                                        disabled={questionAnalysisLoading[q.questionId]}
                                    >
                                        {questionAnalysisLoading[q.questionId] ? 'Analyzing...' : 'Analyze with AI'}
                                    </button>
                                </div>

                                {questionAnalysisError[q.questionId] && (
                                    <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                                        {questionAnalysisError[q.questionId]}
                                    </div>
                                )}

                                {questionAnalysis[q.questionId] && (
                                    <div
                                        style={{
                                            marginTop: '0.75rem',
                                            padding: '0.875rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-subtle)',
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '0.9rem',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>AI Analysis</div>
                                        {questionAnalysis[q.questionId]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Analysis Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: analysis ? '1.5rem' : '0' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            Diagnostic Review
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Generate an AI-powered breakdown of your incorrectly answered questions.
                        </p>
                    </div>
                    {!analysis && !loading && (
                        <button className="btn btn-primary" onClick={fetchAnalysis}>
                            Generate Report
                        </button>
                    )}
                </div>

                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Ask for focused analysis (optional)
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={analysisQuestion}
                            onChange={(e) => setAnalysisQuestion(e.target.value)}
                            placeholder="Example: Why did I miss scheduling questions?"
                            style={{ flex: 1, minWidth: 260 }}
                        />
                        <button className="btn btn-secondary" onClick={fetchAnalysis} disabled={loading}>
                            Analyze
                        </button>
                    </div>
                </div>

                {loading && (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                        <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem', borderTopColor: 'var(--primary)' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500 }}>
                            Synthesizing diagnostic data via Gemini...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="alert alert-error">{error}</div>
                )}

                {analysis && !loading && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        {/* Wrong Questions */}
                        {analysis.wrongQuestions?.length > 0 ? (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{
                                    fontSize: '0.875rem', fontWeight: 600,
                                    marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}>
                                    Missed Items ({analysis.wrongQuestions.length})
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {analysis.wrongQuestions.map((wq, i) => (
                                        <div key={i} style={{
                                            padding: '1.25rem', borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                                        }}>
                                            <p style={{ fontWeight: 500, marginBottom: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                                                {i + 1}. {wq.question}
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{
                                                    padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--danger-bg)', color: 'var(--danger)',
                                                    fontSize: '0.8125rem', fontWeight: 500,
                                                }}>
                                                    Provided Answer: {wq.userAnswer}
                                                </div>
                                                <div style={{
                                                    padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--success-bg)', color: 'var(--success)',
                                                    fontSize: '0.8125rem', fontWeight: 500,
                                                }}>
                                                    Correct Answer: {wq.correctAnswer}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="alert alert-success" style={{ marginBottom: '2rem', fontWeight: 500 }}>
                                100% Accuracy. No remedial review required.
                            </div>
                        )}

                        {/* Gemini Explanation */}
                        {analysis.explanation && (
                            <div>
                                <h3 style={{
                                    fontSize: '0.875rem', fontWeight: 600,
                                    marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}>
                                    AI Strategy Breakdown
                                </h3>
                                <div style={{
                                    padding: '1.5rem', borderRadius: 'var(--radius-md)',
                                    background: 'var(--primary-light)', border: '1px solid rgba(79, 70, 229, 0.2)',
                                    fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {analysis.explanation}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Interactive Chatbot */}
            {analysis && !loading && (
                <div style={{ animation: 'fadeIn 0.6s ease' }}>
                    <AnalysisChatbot attemptId={attemptId} />
                </div>
            )}
        </div>
    );
}
