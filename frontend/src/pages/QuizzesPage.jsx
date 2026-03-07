import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllQuizzes } from '../api';

const CATEGORY_COLORS = {
    Science: 'cyan', Math: 'indigo', History: 'amber',
    Geography: 'emerald', Technology: 'indigo', Literature: 'amber',
};

function getCategoryColor(cat) {
    return CATEGORY_COLORS[cat] || 'indigo';
}

export default function QuizzesPage() {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [questionCount, setQuestionCount] = useState(10);
    const [showModal, setShowModal] = useState(false);
    const [randomTopic, setRandomTopic] = useState('All');

    useEffect(() => {
        (async () => {
            try {
                const res = await getAllQuizzes();
                setQuizzes(res.data.quizzes || []);
            } catch {
                setError('Failed to load quizzes.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const categories = ['All', ...new Set(quizzes.map((q) => q.category).filter(Boolean))];

    const filtered = quizzes.filter((q) => {
        const matchCat = selectedCategory === 'All' || q.category === selectedCategory;
        const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
            q.category?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const handleRandomQuiz = () => {
        const query =
            randomTopic && randomTopic !== 'All'
                ? `?category=${encodeURIComponent(randomTopic)}`
                : '';
        navigate(`/quiz/${questionCount}${query}`);
        setShowModal(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>Quiz Library</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    ⚡ Random Quiz
                </button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>✕ {error}</div>}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem', alignItems: 'center' }}>
                <input
                    className="form-input"
                    style={{ flex: 1, minWidth: 200, maxWidth: 340 }}
                    type="text"
                    placeholder="🔍 Search quizzes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quiz Grid */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>🔍</div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No quizzes found</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Try adjusting your search or category filter.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {filtered.map((quiz) => {
                        const color = getCategoryColor(quiz.category);
                        return (
                            <div key={quiz.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                        background: color === 'indigo' ? 'rgba(99,102,241,0.15)' :
                                            color === 'cyan' ? 'rgba(6,182,212,0.15)' :
                                                color === 'emerald' ? 'rgba(16,185,129,0.15)' :
                                                    'rgba(245,158,11,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.25rem', flexShrink: 0,
                                    }}>
                                        {color === 'indigo' ? '💡' : color === 'cyan' ? '⚗️' : color === 'emerald' ? '🌍' : '📚'}
                                    </div>
                                    <span className={`badge badge-${color}`}>{quiz.category || 'General'}</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        {quiz.title}
                                    </h3>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ flex: 1 }}
                                        onClick={() => navigate('/quiz/10')}
                                    >
                                        Start Quiz
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => navigate(`/leaderboard/${quiz.id}`)}
                                        title="View Leaderboard"
                                    >
                                        🏆
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Random Quiz Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                                ⚡ Random Quiz
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Generate a random quiz with questions sampled from the full question bank.
                        </p>
                        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                            <label className="form-label">Topic</label>
                            <select
                                className="form-input"
                                value={randomTopic}
                                onChange={(e) => setRandomTopic(e.target.value)}
                                style={{ marginBottom: '0.75rem' }}
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <label className="form-label">Number of Questions</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {[5, 10, 15, 20].map((n) => (
                                    <button
                                        key={n}
                                        className={`btn btn-sm ${questionCount === n ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setQuestionCount(n)}
                                    >
                                        {n} Questions
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRandomQuiz}>
                                Start Quiz →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
