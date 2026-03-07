import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api';
import { useAuth } from '../context/AuthContext';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [board, setBoard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await getLeaderboard(quizId);
                setBoard(res.data.leaderboard || []);
            } catch {
                setError('Could not load leaderboard.');
            } finally {
                setLoading(false);
            }
        })();
    }, [quizId]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="spinner spinner-lg" />
        </div>
    );

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: 700 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>←</button>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>
                        🏆 Leaderboard
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Top 10 performers</p>
                </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>✕ {error}</div>}

            {board.length === 0 && !error ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No attempts yet</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Be the first to attempt this quiz!
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/quizzes')}>
                        Take a Quiz →
                    </button>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    {board.length >= 3 && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            gap: '1rem', marginBottom: '2rem',
                        }}>
                            {[board[1], board[0], board[2]].map((entry, i) => {
                                if (!entry) return null;
                                const heights = [110, 140, 95];
                                const places = [1, 0, 2];
                                const rank = places[i];
                                const isCurrentUser = entry.userId?._id === user?.id;
                                return (
                                    <div key={entry._id} style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        gap: '0.5rem', flex: i === 1 ? 1.2 : 1, maxWidth: 160,
                                    }}>
                                        <div style={{
                                            width: 52, height: 52, borderRadius: '50%',
                                            background: rank === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                                rank === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                                    'linear-gradient(135deg, #d97706, #b45309)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '1.1rem', color: '#fff',
                                            border: isCurrentUser ? '3px solid var(--primary)' : 'none',
                                            boxShadow: rank === 0 ? '0 0 20px rgba(251,191,36,0.4)' : 'none',
                                        }}>
                                            {entry.userId?.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div style={{ fontSize: '1.5rem' }}>{MEDAL[rank]}</div>
                                        <div style={{
                                            width: '100%', background: 'var(--bg-card)',
                                            border: `1px solid ${isCurrentUser ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            padding: '1rem 0.5rem', textAlign: 'center',
                                            height: heights[i], display: 'flex', flexDirection: 'column',
                                            justifyContent: 'flex-end', gap: '0.25rem',
                                        }}>
                                            <div style={{
                                                fontWeight: 700, fontSize: '1.25rem', color:
                                                    rank === 0 ? '#fbbf24' : rank === 1 ? '#94a3b8' : '#d97706'
                                            }}>
                                                {entry.score}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                {entry.userId?.name || 'User'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full Table */}
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}>#</th>
                                    <th>Player</th>
                                    <th style={{ textAlign: 'right' }}>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {board.map((entry, idx) => {
                                    const isCurrentUser = entry.userId?._id === user?.id;
                                    return (
                                        <tr key={entry._id} style={{
                                            background: isCurrentUser ? 'rgba(99,102,241,0.06)' : undefined,
                                        }}>
                                            <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                                                {idx < 3 ? MEDAL[idx] : idx + 1}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: `hsl(${(idx * 67 + 220) % 360}, 70%, 55%)`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                                                        flexShrink: 0,
                                                    }}>
                                                        {entry.userId?.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span style={{ fontWeight: isCurrentUser ? 700 : 500 }}>
                                                        {entry.userId?.name || 'Anonymous'}
                                                        {isCurrentUser && (
                                                            <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>You</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
                                                    background: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                                        idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                                            idx === 2 ? 'linear-gradient(135deg, #d97706, #b45309)' :
                                                                'var(--gradient-primary)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundClip: 'text',
                                                }}>
                                                    {entry.score}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
