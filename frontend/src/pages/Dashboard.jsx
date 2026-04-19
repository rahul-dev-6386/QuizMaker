import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllQuizzes, getDashboardStats, getAttempts } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChartIcon, DashboardIcon, QuizIcon, TrophyIcon } from '../components/Icons';

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className={`stat-card ${color}`} style={{ cursor: 'default' }}>
            <div className="stat-icon" style={{
                background: color === 'indigo' ? 'rgba(99,102,241,0.15)' :
                    color === 'cyan' ? 'rgba(6,182,212,0.15)' :
                        color === 'emerald' ? 'rgba(16,185,129,0.15)' :
                            'rgba(245,158,11,0.15)',
            }}>
                {icon}
            </div>
            <div className="stat-value" style={{
                background: color === 'indigo' ? 'linear-gradient(135deg, #818cf8, #6366f1)' :
                    color === 'cyan' ? 'linear-gradient(135deg, #22d3ee, #06b6d4)' :
                        color === 'emerald' ? 'linear-gradient(135deg, #34d399, #10b981)' :
                            'linear-gradient(135deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
            }}>
                {value}
            </div>
            <div className="stat-label">{label}</div>
            {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
    );
}

function ScoreBadge({ score, total }) {
    const pct = total ? Math.round((score / total) * 100) : 0;
    const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
            background: `${color}22`, border: `1px solid ${color}44`,
            fontSize: '0.85rem', fontWeight: 700, color,
        }}>
            {score}/{total}
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showStartModal, setShowStartModal] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('All');
    const [selectedCount, setSelectedCount] = useState(5);
    const [showAllAttempts, setShowAllAttempts] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [statsRes, attemptsRes] = await Promise.all([
                    getDashboardStats(), getAttempts(),
                ]);
                setStats(statsRes.data);
                setAttempts(attemptsRes.data.attempts || []);
                const quizRes = await getAllQuizzes();
                const categories = Array.from(
                    new Set((quizRes.data.quizzes || []).map((q) => q.category).filter(Boolean))
                );
                setTopics(categories);
            } catch {
                setError('Could not load dashboard data.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const startChallenge = () => {
        const query =
            selectedTopic && selectedTopic !== 'All'
                ? `?category=${encodeURIComponent(selectedTopic)}`
                : '';
        navigate(`/quiz/${selectedCount}${query}`);
        setShowStartModal(false);
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getAttemptTitle = (attempt) => attempt.displayTitle || attempt.quizId?.title || 'Quiz';
    const getAttemptTopic = (attempt) => attempt.topicLabel || attempt.quizId?.category || '—';
    const isRandomAttempt = (attempt) => attempt.attemptMode === 'random';


    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    const visibleAttempts = showAllAttempts ? attempts : attempts.slice(0, 5);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>
                            {greeting()}, {user?.name?.split(' ')[0] || 'Learner'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                            Here's an overview of your quiz performance.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/quizzes')}>
                        Take a Quiz
                    </button>
                </div>
            </div>

            {/* Gamification Banner */}
            {stats && stats.gamification && (
                <div className="card" style={{
                    marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))',
                    borderColor: 'rgba(16,185,129,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>Lvl {stats.gamification.level}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Current Level</div>
                            </div>
                            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }}></div>
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.gamification.xp} XP</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Earn more by taking quizzes</div>
                            </div>
                            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }}></div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem' }}>🔥 {stats.gamification.streak}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day Streak</div>
                            </div>
                        </div>
                        {stats.gamification.badges.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {stats.gamification.badges.map((badge) => (
                                    <span key={badge} className="badge" style={{ background: '#fbbf24', color: '#fff', border: 'none' }}>🏆 {badge}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>✕ {error}</div>}

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem', marginBottom: '2.5rem',
            }}>
                <StatCard icon={<QuizIcon size={18} />} label="Quizzes Taken" value={stats?.totalQuizzes ?? 0} color="indigo" />
                <StatCard icon={<TrophyIcon size={18} />} label="Best Score" value={stats?.bestScore ?? 0} color="amber" />
                <StatCard
                    icon={<ChartIcon size={18} />}
                    label="Accuracy"
                    value={`${Math.round(stats?.accuracyPercent ?? 0)}%`}
                    sub={`${stats?.totalQuestionsAttempted ?? 0} questions attempted`}
                    color="cyan"
                />
                <StatCard
                    icon={<ChartIcon size={18} />}
                    label="Average Score"
                    value={`${Math.round(stats?.averageScore ?? 0)}`}
                    sub={stats?.totalQuizzes ? 'Across all attempts' : 'No attempts yet'}
                    color="emerald"
                />
            </div>



            {/* Recent Attempts */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600 }}>
                        Recent Attempts
                    </h2>
                    {attempts.length > 0 && (
                        <Link to="/quizzes" className="btn btn-ghost btn-sm">View Quizzes →</Link>
                    )}
                </div>

                {attempts.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}><DashboardIcon size={28} /></div>
                        <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            No attempts yet
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Take your first quiz and your results will appear here.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/quizzes')}>
                            Browse Quizzes
                        </button>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Quiz</th>
                                    <th>Category</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleAttempts.map((a) => (
                                    <tr key={a._id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {getAttemptTitle(a)}
                                        </td>
                                        <td>
                                            <span className="badge badge-primary">{getAttemptTopic(a)}</span>
                                        </td>
                                        <td>
                                            <ScoreBadge score={a.score} total={a.answers?.length || 0} />
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {new Date(a.submittedAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() =>
                                                        navigate(`/results/${a._id}`, {
                                                            state: {
                                                                score: a.score,
                                                                total: a.answers?.length || 0,
                                                            },
                                                        })
                                                    }
                                                >
                                                    Analysis
                                                </button>
                                                {!isRandomAttempt(a) && a.quizId?._id && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => navigate(`/leaderboard/${a.quizId?._id}`)}
                                                    >
                                                        Leaderboard
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {attempts.length > 5 && (
                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setShowAllAttempts(!showAllAttempts)}>
                                    {showAllAttempts ? 'Show Less' : 'Show All Attempts'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
            }}>
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
                    borderColor: 'rgba(99,102,241,0.2)',
                }}>
                    <div style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}><QuizIcon size={20} /></div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Quick 5-Question Quiz
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                        Test yourself with a rapid 5-question session from a random category.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/quiz/5')}>
                        Start
                    </button>
                </div>

                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(16,185,129,0.06))',
                    borderColor: 'rgba(6,182,212,0.2)',
                }}>
                    <div style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}><TrophyIcon size={20} /></div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Full 10-Question Challenge
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                        Face a comprehensive 10-question quiz and climb the leaderboard.
                    </p>
                    <button className="btn btn-accent btn-sm" onClick={() => navigate('/quiz/10')}>
                        Challenge
                    </button>
                </div>

                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(248,113,113,0.06))',
                    borderColor: 'rgba(239,68,68,0.2)',
                }}>
                    <div style={{ color: '#ef4444', marginBottom: '0.75rem' }}>⚔️</div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Live Multiplayer Battle
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                        Queue up and challenge another learner in a real-time showdown!
                    </p>
                    <button className="btn btn-danger btn-sm" onClick={() => navigate('/battle')}>
                        Battle Now
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Start with Topic</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                    Choose topic and number of questions before starting.
                </p>
                <button className="btn btn-primary" onClick={() => setShowStartModal(true)}>
                    Configure Challenge
                </button>
            </div>

            {showStartModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 260,
                        padding: '1rem',
                    }}
                    onClick={() => setShowStartModal(false)}
                >
                    <div className="card" style={{ width: '100%', maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Configure Quiz</h3>

                        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                            <label className="form-label">Topic</label>
                            <select
                                className="form-input"
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                            >
                                <option value="All">All Topics</option>
                                {topics.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Number of Questions</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[5, 10, 15, 20].map((n) => (
                                    <button
                                        key={n}
                                        className={`btn btn-sm ${selectedCount === n ? 'btn-primary' : 'btn-secondary'}`}
                                        type="button"
                                        onClick={() => setSelectedCount(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowStartModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={startChallenge}>Start Quiz</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
