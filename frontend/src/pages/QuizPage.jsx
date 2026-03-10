import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getRandomQuiz, submitQuiz } from '../api';
import MathText from '../components/MathText';

const STATUS_COLORS = {
    notVisited: { bg: '#ffffff', text: '#0f172a', border: '#cbd5e1' },
    notAnswered: { bg: '#ef4444', text: '#ffffff', border: '#ef4444' },
    marked: { bg: '#7c3aed', text: '#ffffff', border: '#7c3aed' },
    answeredMarked: { bg: '#c4b5fd', text: '#111827', border: '#a78bfa' },
    answered: { bg: '#22c55e', text: '#ffffff', border: '#22c55e' },
};

function getQuestionStatus(questionId, visitedMap, selectedMap, reviewMap) {
    const visited = !!visitedMap[questionId];
    const answered = selectedMap[questionId] !== undefined;
    const marked = !!reviewMap[questionId];

    if (!visited) return 'notVisited';
    if (marked && answered) return 'answeredMarked';
    if (marked) return 'marked';
    if (answered) return 'answered';
    return 'notAnswered';
}

export default function QuizPage() {
    const { count } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const selectedCategory = new URLSearchParams(location.search).get('category') || '';

    const [questions, setQuestions] = useState([]);
    const [quizMeta, setQuizMeta] = useState(null);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState({});
    const [review, setReview] = useState({});
    const [visited, setVisited] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(null);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= 900 : false
    );

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 900);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRandomQuiz(count, selectedCategory || undefined);
                const qs = res.data.questions || [];
                setQuestions(qs);
                if (qs.length > 0) {
                    setQuizMeta({ quizId: qs[0].quizId });
                    setVisited({ [qs[0].questionId]: true });
                }
                setTimeLeft(parseInt(count, 10) * 60);
            } catch (err) {
                const code = err.response?.data?.code;
                if (code === 'INSUFFICIENT_QUESTIONS') {
                    const available = err.response?.data?.availableCount;
                    const requested = err.response?.data?.requestedCount || count;
                    setError(
                        `Requested ${requested} question(s), but only ${available} available. Choose a lower count or add more questions.`
                    );
                } else {
                    setError(err.response?.data?.message || 'Could not load quiz questions.');
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [count, selectedCategory]);

    useEffect(() => {
        if (!questions[current]?.questionId) return;
        const qid = questions[current].questionId;
        setVisited((prev) => ({ ...prev, [qid]: true }));
    }, [current, questions]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [timeLeft === null ? 'idle' : timeLeft > 0 ? 'running' : 'done']);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const timerColor =
        timeLeft !== null
            ? timeLeft < 30
                ? 'var(--danger)'
                : timeLeft < 60
                    ? 'var(--warning)'
                    : 'var(--success)'
            : 'var(--success)';

    const answeredCount = Object.values(selected).filter((v) => v !== undefined).length;

    const statusCounts = useMemo(() => {
        const counts = {
            notVisited: 0,
            notAnswered: 0,
            marked: 0,
            answeredMarked: 0,
            answered: 0,
        };
        for (const q of questions) {
            counts[getQuestionStatus(q.questionId, visited, selected, review)] += 1;
        }
        return counts;
    }, [questions, visited, selected, review]);

    const payloadForSubmit = () => ({
        answers: questions.map((q) => ({
            questionId: q.questionId,
            answer: selected[q.questionId] !== undefined ? String(selected[q.questionId]) : '',
        })),
        quizId: quizMeta?.quizId,
    });

    const executeSubmit = async () => {
        setSubmitting(true);
        const res = await submitQuiz(payloadForSubmit());
        navigate(`/results/${res.data.attemptId}`, {
            state: { score: res.data.score, total: res.data.total },
        });
    };

    const handleSubmit = async () => {
        clearInterval(timerRef.current);
        try {
            await executeSubmit();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit quiz.');
            setSubmitting(false);
        }
    };

    const handleSelect = (questionId, optionId) => {
        setSelected((prev) => ({ ...prev, [questionId]: optionId }));
    };

    const handleClearResponse = () => {
        const qid = questions[current]?.questionId;
        if (!qid) return;
        setSelected((prev) => {
            const next = { ...prev };
            delete next[qid];
            return next;
        });
    };

    const toggleReview = () => {
        const qid = questions[current]?.questionId;
        if (!qid) return;
        setReview((prev) => ({ ...prev, [qid]: !prev[qid] }));
    };

    const markForReviewAndNext = () => {
        const qid = questions[current]?.questionId;
        if (!qid) return;
        setReview((prev) => ({ ...prev, [qid]: true }));
        if (current < questions.length - 1) setCurrent((c) => c + 1);
    };

    const saveAndNext = () => {
        if (current < questions.length - 1) setCurrent((c) => c + 1);
    };

    const handleQuitQuiz = () => {
        const ok = window.confirm('Are you sure you want to quit this quiz? Your current attempt will not be submitted.');
        if (!ok) return;
        clearInterval(timerRef.current);
        navigate('/quizzes');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
                <div className="spinner spinner-lg" />
                <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
            </div>
        );
    }

    if (error && questions.length === 0) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <div className="alert alert-error" style={{ display: 'inline-flex', maxWidth: 420 }}>{error}</div>
                <div style={{ marginTop: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/quizzes')}>Back to Quizzes</button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No questions available.</p>
                <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => navigate('/quizzes')}>Back</button>
            </div>
        );
    }

    const q = questions[current];
    const qStatus = getQuestionStatus(q.questionId, visited, selected, review);

    return (
        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem', maxWidth: '1360px' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 320px',
                    gap: '1rem',
                }}
            >
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                Question {current + 1} of {questions.length}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                Answered: {answeredCount} / {questions.length}
                            </p>
                        </div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '999px',
                            border: `1px solid ${timerColor}55`,
                            color: timerColor,
                            background: `${timerColor}14`,
                            fontWeight: 700,
                        }}>
                            Time Left: {formatTime(timeLeft || 0)}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Topic: <strong style={{ color: 'var(--text-primary)' }}>{selectedCategory || 'All Categories'}</strong>
                        </div>
                        <button type="button" className="btn btn-danger btn-sm" onClick={handleQuitQuiz}>
                            Quit Quiz
                        </button>
                    </div>

                    {error && <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>{error}</div>}

                    <div style={{ marginBottom: '0.9rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Current Status: <strong style={{ color: 'var(--text-primary)' }}>{qStatus}</strong>
                    </div>

                    <div style={{ marginBottom: '1rem', fontSize: '1.03rem', fontWeight: 600, lineHeight: 1.6 }}>
                        <MathText text={q.question} />
                    </div>

                    {q.questionImage && (
                        <div style={{ marginBottom: '1rem' }}>
                            <img
                                src={q.questionImage}
                                alt="Question visual"
                                style={{
                                    width: '100%',
                                    maxHeight: '280px',
                                    objectFit: 'contain',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-surface)',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                        {(q.options || []).map((opt, idx) => {
                            const optionId = String(opt?.id ?? idx);
                            const optionText = typeof opt === 'string' ? opt : opt?.text;
                            const isSelected = selected[q.questionId] === optionId;
                            return (
                                <button
                                    key={optionId}
                                    type="button"
                                    onClick={() => handleSelect(q.questionId, optionId)}
                                    style={{
                                        display: 'flex',
                                        gap: '0.8rem',
                                        alignItems: 'center',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <span style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '999px',
                                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}>
                                        {isSelected ? '✓' : ['A', 'B', 'C', 'D'][idx] || idx + 1}
                                    </span>
                                    <span><MathText text={optionText} /></span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearResponse}>
                            Clear Response
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleReview}>
                            {review[q.questionId] ? 'Unmark Review' : 'Mark for Review'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={markForReviewAndNext}>
                            Mark for Review & Next
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveAndNext}>
                            Save & Next
                        </button>
                    </div>

                    <div style={{ display: 'flex', marginTop: '1rem', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                            disabled={current === 0}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Question Palette</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.9rem' }}>
                        {questions.map((item, idx) => {
                            const status = getQuestionStatus(item.questionId, visited, selected, review);
                            const c = STATUS_COLORS[status];
                            const isCurrent = idx === current;
                            return (
                                <button
                                    key={item.questionId}
                                    type="button"
                                    onClick={() => setCurrent(idx)}
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: '8px',
                                        border: isCurrent ? '2px solid #111827' : `1px solid ${c.border}`,
                                        background: c.bg,
                                        color: c.text,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        margin: '0 auto',
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                        {[
                            ['Not Visited', 'notVisited'],
                            ['Not Answered', 'notAnswered'],
                            ['Marked for Review', 'marked'],
                            ['Answered & Marked', 'answeredMarked'],
                            ['Answered', 'answered'],
                        ].map(([label, key]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 3,
                                    border: `1px solid ${STATUS_COLORS[key].border}`,
                                    background: STATUS_COLORS[key].bg,
                                }} />
                                {label}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>Not Visited: {statusCounts.notVisited}</div>
                        <div>Not Answered: {statusCounts.notAnswered}</div>
                        <div>Marked: {statusCounts.marked}</div>
                        <div>Answered & Marked: {statusCounts.answeredMarked}</div>
                        <div>Answered: {statusCounts.answered}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
