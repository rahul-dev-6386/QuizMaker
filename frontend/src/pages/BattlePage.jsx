import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAllQuizzes, getDashboardStats } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MathText from '../components/MathText';

const SOCKET_SERVER_URL =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    'http://localhost:3000';
const QUESTION_TIME_LIMIT = 20;

export default function BattlePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const currentUserId = String(user?.id || user?._id || '');

    const [status, setStatus] = useState('idle'); // idle, queue, active, result
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [categoryOptions, setCategoryOptions] = useState(['General']);
    const [lobbyStats, setLobbyStats] = useState({});
    const [queueWait, setQueueWait] = useState(0);
    const [stats, setStats] = useState(null);
    const queueTimerRef = useRef(null);

    const battlePeriods = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
    ];
    
    const [gameState, setGameState] = useState({
        roomId: null,
        selfSocketId: null,
        players: [],
        questions: [],
        currentQ: 0,
        winnerId: null,
        winnerSocketId: null,
        winnerName: null,
        finalScores: []
    });

    const [selectedOption, setSelectedOption] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const timerRef = useRef(null);

    const startQuestionTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeElapsed(0);
        timerRef.current = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);
    };

    const stopQuestionTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const leaveQueue = () => {
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        // Just reconnect socket to drop out of queue
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.connect();
        }
        setStatus('idle');
    };

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const socket = io(SOCKET_SERVER_URL, {
            withCredentials: true,
            auth: {
                token: document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1]
            }
        });
        socketRef.current = socket;

        socket.on('lobbyStats', (data) => {
            setLobbyStats(data);
        });

        (async () => {
            try {
                const [res, statsRes] = await Promise.all([
                    getAllQuizzes(),
                    getDashboardStats()
                ]);
                const categories = Array.from(
                    new Set((res.data.quizzes || []).map((q) => q.category).filter(Boolean))
                );
                if (!categories.includes('General')) {
                    categories.unshift('General');
                }
                setCategoryOptions(categories);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to load data', err);
            }
        })();

        socket.on('gameStart', (data) => {
            setGameState({
                roomId: data.roomId,
                selfSocketId: data.selfSocketId,
                players: data.players,
                questions: data.questions,
                currentQ: 0,
                winnerId: null,
                winnerSocketId: null,
                winnerName: null,
                finalScores: []
            });
            setStatus('active');
            setSelectedOption(null);
            setTimeElapsed(0);
            startQuestionTimer();
        });

        socket.on('scoreUpdate', (data) => {
            setGameState(prev => ({
                ...prev,
                players: data.players
            }));
        });

        socket.on('gameOver', (data) => {
            setGameState(prev => ({
                ...prev,
                winnerId: data.winnerId,
                winnerSocketId: data.winnerSocketId,
                winnerName: data.winnerName,
                finalScores: data.finalScores
            }));
            setStatus('result');
            stopQuestionTimer();
        });

        socket.on('opponentDisconnected', () => {
            alert("Your opponent disconnected. You won by default!");
            setStatus('idle');
            stopQuestionTimer();
        });

        return () => {
            socket.disconnect();
            stopQuestionTimer();
            if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        };
    }, [user, navigate]);

    useEffect(() => {
        if (status === 'queue' && queueWait >= 120) {
            alert('Failed to find opponent within 2 minutes. Please try another category.');
            leaveQueue();
        }
    }, [queueWait, status]);

    const joinQueue = () => {
        if (!socketRef.current) return;
        setStatus('queue');
        setQueueWait(0);
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        queueTimerRef.current = setInterval(() => {
            setQueueWait(prev => prev + 1);
        }, 1000);

        socketRef.current.emit('joinQueue', {
            userId: currentUserId,
            name: user.name,
            category: selectedCategory
        });
    };

    const submitAnswer = (optIndex) => {
        if (selectedOption !== null) return; // already answered
        const answerIndex = optIndex ?? -1;
        setSelectedOption(answerIndex);
        
        const q = gameState.questions[gameState.currentQ];
        if (!q) return;
        const isCorrect = String(q.correctAnswer) === String(answerIndex);

        socketRef.current.emit('submitAnswer', {
            roomId: gameState.roomId,
            questionIndex: gameState.currentQ,
            isCorrect,
            scoreTimeElapsed: timeElapsed
        });

        // Move to next question after a brief delay
        setTimeout(() => {
            if (gameState.currentQ < gameState.questions.length - 1) {
                setGameState(prev => ({ ...prev, currentQ: prev.currentQ + 1 }));
                setSelectedOption(null);
                startQuestionTimer();
            } else {
                stopQuestionTimer();
                // Wait for gameOver event
            }
        }, 1500);
    };

    useEffect(() => {
        if (status !== 'active' || selectedOption !== null) return;
        if (timeElapsed < QUESTION_TIME_LIMIT) return;
        submitAnswer(null);
    }, [status, selectedOption, timeElapsed]);

    const renderIdle = () => (
        <div style={{ maxWidth: 1560, margin: '0 auto' }}>
            {/* Standard Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>
                            Live 1v1 Battle Arena
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                            Match instantly, answer fast, and climb above your rival in a live five-question duel.
                        </p>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.4rem 0.8rem', borderRadius: 999, fontSize: '0.875rem', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                        Servers Online
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.35fr) minmax(400px, 0.65fr)', gap: '1.5rem', alignItems: 'start' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Matchmaking Action */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Start A Battle</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Queue for a live head-to-head match. We&apos;ll pair you with the next learner in the same topic.
                        </p>
                        
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label className="form-label">Category</label>
                            <select className="form-input" style={{ fontSize: '1rem', padding: '0.75rem', marginBottom: '0.5rem' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', marginRight: 6 }}></span>
                                {lobbyStats[selectedCategory] || 0} users playing <strong>{selectedCategory}</strong>
                            </div>
                        </div>
                        
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={joinQueue}>
                            Find Match
                        </button>
                    </div>

                    {/* Left Card: Information */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>How It Works</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>1</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Pick a Category</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>Choose your topic and the match will draw a fresh shuffled set from available quizzes in that category.</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>2</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Beat The Clock</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>Correct answers score higher when you answer earlier, so speed matters just as much as accuracy.</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>3</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Claim The Win</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>After five questions, the higher score wins. Tied scores finish as a draw.</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {stats?.battleStats && (
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(15,159,168,0.08))',
                        borderColor: 'rgba(15,159,168,0.18)',
                        height: '100%',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                        <div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                Live Battle Analysis
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                                Your real-time 1v1 record updates automatically after every completed battle.
                            </p>
                        </div>
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}>
                            ⚔️ Multiplayer Stats
                        </span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem',
                    }}>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Matches</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>{stats?.battleStats?.matches ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(15,159,110,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wins</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.3rem' }}>{stats?.battleStats?.wins ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(209,67,67,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Losses</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.3rem' }}>{stats?.battleStats?.losses ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(200,129,26,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Draws</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.3rem' }}>{stats?.battleStats?.draws ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(21,94,239,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Win Rate</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.3rem' }}>{Math.round(stats?.battleStats?.winRate ?? 0)}%</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(15,159,168,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Streak</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.3rem' }}>{stats?.battleStats?.currentStreak ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid rgba(251,191,36,0.24)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Best Streak</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.3rem' }}>{stats?.battleStats?.bestStreak ?? 0}</div>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem',
                        marginTop: '1.25rem',
                    }}>
                        <div style={{ padding: '1rem', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Recent Battle History</h3>
                            {(stats?.battleStats?.recent || []).length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No live battles recorded yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                    {stats.battleStats.recent.map((match) => {
                                        const resultColor =
                                            match.result === 'win'
                                                ? 'var(--success)'
                                                : match.result === 'loss'
                                                    ? 'var(--danger)'
                                                    : 'var(--warning)';
                                        return (
                                            <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: 12, background: 'var(--bg-subtle)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: resultColor, textTransform: 'capitalize' }}>{match.result}</div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                        vs {match.opponentName} · {match.category}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 800 }}>{match.score} - {match.opponentScore}</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                        {new Date(match.completedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '1rem', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Battle Leaderboards</h3>
                            <div style={{ display: 'grid', gap: '0.9rem' }}>
                                {battlePeriods.map((period) => {
                                    const leaders = stats?.battleStats?.leaderboard?.[period.key] || [];
                                    return (
                                        <div key={period.key}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.45rem' }}>
                                                {period.label} Top Wins
                                            </div>
                                            {leaders.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No winners yet.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                    {leaders.map((leader, index) => (
                                                        <div key={`${period.key}-${leader._id || index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'var(--bg-subtle)' }}>
                                                            <span style={{ fontWeight: 700 }}>{index + 1}. {leader.name}</span>
                                                            <span style={{ color: 'var(--success)', fontWeight: 800 }}>{leader.wins} win{leader.wins === 1 ? '' : 's'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                )}
                </div>
            </div>
        </div>
    );

    const renderQueue = () => (
        <div style={{ maxWidth: 700, margin: '4rem auto', textAlign: 'center' }}>
            <div style={{
                position: 'relative',
                width: 140, height: 140, margin: '0 auto 3rem auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                className: 'battle-matchmaking-pulse'
            }}>
                {/* Pulse ring using our existing pulseGlow animation */ }
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    animation: 'pulseGlow 2s infinite',
                    border: '2px dashed #ef4444'
                }}></div>
                <span style={{ fontSize: '3.5rem' }}>⚔️</span>
            </div>

            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Matchmaking In Progress
            </h2>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
                Looking for another player in <strong style={{ color: 'var(--primary)' }}>{selectedCategory}</strong>. Keep this tab open and get ready for a five-question sprint.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '1rem', padding: '0.6rem 1.2rem', borderRadius: 12 }}>
                    Category: <strong style={{ color: 'var(--primary)' }}>{selectedCategory}</strong>
                </span>
                <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '1rem', padding: '0.6rem 1.2rem', borderRadius: 12 }}>
                    Active Challengers: <strong style={{ color: 'var(--success)' }}>{lobbyStats[selectedCategory] || 0}</strong>
                </span>
                <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '1rem', padding: '0.6rem 1.2rem', borderRadius: 12 }}>
                    Elapsed: <strong style={{ color: queueWait > 90 ? 'var(--danger)' : 'var(--accent)' }}>{queueWait}s / 120s</strong>
                </span>
            </div>

            <button className="btn btn-secondary btn-lg" style={{ borderRadius: 999, padding: '1rem 3rem', fontSize: '1.05rem', boxShadow: 'var(--shadow-sm)' }} onClick={leaveQueue}>
                Cancel Matchmaking
            </button>
        </div>
    );

    const renderActiveData = () => {
        if (!gameState.questions.length) return null;
        const q = gameState.questions[gameState.currentQ];
        const isCurrentUser = (player) =>
            String(player?.socketId || '') === String(gameState.selfSocketId || '') ||
            String(player?.id || '') === currentUserId;
        
        return (
            <div style={{ maxWidth: 980, margin: '2rem auto' }}>
                {/* Scoreboard */}
                <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'stretch', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(16,35,63,0.98), rgba(15,31,55,0.92))', color: '#fff', borderColor: 'rgba(255,255,255,0.08)' }}>
                    {gameState.players.map((p, i) => (
                        <div key={p.socketId || p.id || i} style={{ padding: '1rem 1.1rem', borderRadius: 16, border: isCurrentUser(p) ? '1px solid rgba(15,159,168,0.45)' : '1px solid rgba(255,255,255,0.08)', background: isCurrentUser(p) ? 'rgba(15,159,168,0.12)' : 'rgba(255,255,255,0.03)' }}>
                            <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: isCurrentUser(p) ? '#7ee7e3' : 'rgba(255,255,255,0.65)', marginBottom: '0.4rem' }}>
                                {isCurrentUser(p) ? 'You' : 'Opponent'}
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{p.name}{isCurrentUser(p) ? ' (You)' : ''}</div>
                            <div style={{ fontSize: '1.65rem', color: '#3dd9d1', marginTop: '0.35rem' }}>{p.score} pts</div>
                            <div style={{ fontSize: '0.82rem', opacity: 0.82, marginTop: '0.35rem' }}>Answered {Math.min(p.answeredCount || 0, gameState.questions.length)} / {gameState.questions.length}</div>
                        </div>
                    ))}
                </div>

                {/* Question Area */}
                <div className="card" style={{ padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.95rem' }}>Question {gameState.currentQ + 1} of {gameState.questions.length}</span>
                        <span className="badge" style={{ background: timeElapsed > 10 ? 'var(--danger-bg)' : 'var(--bg-subtle)', color: timeElapsed > 10 ? 'var(--danger)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>⏱ {timeElapsed}s / {QUESTION_TIME_LIMIT}s</span>
                    </div>

                    <h2 style={{ fontSize: '1.7rem', marginBottom: '0.8rem', lineHeight: 1.35 }}><MathText text={q.question} /></h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
                        Select one answer before the timer runs out. Missed questions are submitted automatically.
                    </p>
                    
                    {q.questionImage && <img src={q.questionImage} alt="Question" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: '2rem' }} />}

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {q.options.map((opt, idx) => {
                            let btnClass = "btn btn-secondary";
                            if (selectedOption !== null) {
                                if (String(idx) === String(q.correctAnswer)) btnClass = "btn btn-success"; // show correct
                                else if (selectedOption === idx) btnClass = "btn btn-danger"; // showed wrong if clicked
                            }

                            return (
                                <button 
                                    key={idx} 
                                    className={btnClass}
                                    style={{ textAlign: 'left', padding: '1rem', fontSize: '1.1rem', justifyContent: 'flex-start' }}
                                    onClick={() => submitAnswer(idx)}
                                    disabled={selectedOption !== null}
                                >
                                    <MathText text={opt} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderResult = () => (
        (() => {
            const isCurrentUser = (player) =>
                String(player?.socketId || '') === String(gameState.selfSocketId || '') ||
                String(player?.id || '') === currentUserId;
            const sortedScores = [...gameState.finalScores].sort((a, b) => b.score - a.score);
            const topScore = sortedScores[0]?.score;
            const leaders = sortedScores.filter((p) => p.score === topScore);
            const currentPlayer = sortedScores.find((p) => isCurrentUser(p));
            const resultTitle = !currentPlayer || topScore === undefined
                ? 'Battle Complete'
                : leaders.length > 1
                    ? '🤝 Draw'
                    : isCurrentUser(sortedScores[0])
                        ? '🎉 You Won!'
                        : '😔 You Lost';
            const resultSummary = !currentPlayer || topScore === undefined
                ? 'The battle has ended.'
                : leaders.length > 1
                    ? 'Both players finished with the same score. Well played.'
                    : isCurrentUser(sortedScores[0])
                        ? 'You finished on top. Strong pace and accuracy.'
                        : 'Your opponent finished ahead this round. Queue again and run it back.';

            return (
                <div className="card" style={{ maxWidth: 620, margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{resultTitle}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '1rem' }}>{resultSummary}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', margin: '2rem 0', textAlign: 'left' }}>
                        {sortedScores.map((p, i) => (
                            <div key={p.socketId || p.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.1rem', background: 'var(--bg-surface)', borderRadius: 12, border: isCurrentUser(p) ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.08rem' }}>{i + 1}. {p.name}{isCurrentUser(p) ? ' (You)' : ''}</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.15rem' }}>{p.score} pts</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => setStatus('idle')} style={{ width: '100%' }}>Play Again</button>
                </div>
            );
        })()
    );

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            {status === 'idle' && renderIdle()}
            {status === 'queue' && renderQueue()}
            {status === 'active' && renderActiveData()}
            {status === 'result' && renderResult()}
        </div>
    );
}
