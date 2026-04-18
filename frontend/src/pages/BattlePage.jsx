import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAllQuizzes } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MathText from '../components/MathText';

const SOCKET_SERVER_URL =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    'http://localhost:3000';

export default function BattlePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [status, setStatus] = useState('idle'); // idle, queue, active, result
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [categoryOptions, setCategoryOptions] = useState(['General']);
    const [lobbyStats, setLobbyStats] = useState({});
    const [queueWait, setQueueWait] = useState(0);
    const queueTimerRef = useRef(null);
    
    const [gameState, setGameState] = useState({
        roomId: null,
        players: [],
        questions: [],
        currentQ: 0,
        winnerId: null,
        winnerName: null,
        finalScores: []
    });

    const [selectedOption, setSelectedOption] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const socket = io(SOCKET_SERVER_URL);
        socketRef.current = socket;

        socket.on('lobbyStats', (data) => {
            setLobbyStats(data);
        });

        (async () => {
            try {
                const res = await getAllQuizzes();
                const categories = Array.from(
                    new Set((res.data.quizzes || []).map((q) => q.category).filter(Boolean))
                );
                if (!categories.includes('General')) {
                    categories.unshift('General');
                }
                setCategoryOptions(categories);
            } catch (err) {
                console.error('Failed to load categories', err);
            }
        })();

        socket.on('gameStart', (data) => {
            setGameState({
                roomId: data.roomId,
                players: data.players,
                questions: data.questions,
                currentQ: 0,
                winnerId: null,
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

    const startQuestionTimer = () => {
        setTimeElapsed(0);
        timerRef.current = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);
    };

    const stopQuestionTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const joinQueue = () => {
        if (!socketRef.current) return;
        setStatus('queue');
        setQueueWait(0);
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        queueTimerRef.current = setInterval(() => {
            setQueueWait(prev => prev + 1);
        }, 1000);

        socketRef.current.emit('joinQueue', {
            userId: user.id || user._id,
            name: user.name,
            category: selectedCategory
        });
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

    const submitAnswer = (optIndex) => {
        if (selectedOption !== null) return; // already answered
        setSelectedOption(optIndex);
        
        const q = gameState.questions[gameState.currentQ];
        const isCorrect = String(q.correctAnswer) === String(optIndex);

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

    const renderIdle = () => (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Standard Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>
                            Live Multiplayer Battle
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                            Queue up against other learners in real-time matchmaking.
                        </p>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.4rem 0.8rem', borderRadius: 999, fontSize: '0.875rem', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                        Servers Online
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Left Card: Information */}
                <div className="card">
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>How It Works</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>1</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Pick a Category</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>Choose a specific subject or select General to include questions from every topic.</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>2</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Answer Fast</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>You lose 10 points for every second you wait. Lock in your answers instantly!</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>3</div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Dominate</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>Outscore your opponent across all questions to claim victory.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Matchmaking Action */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Find Opponent</h2>
                    
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
            </div>
        </div>
    );

    const renderQueue = () => (
        <div style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
            <div style={{
                position: 'relative',
                width: 140, height: 140, margin: '0 auto 3rem auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)'
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
                Searching Data Feeds...
            </h2>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
                Scanning globally for a worthy opponent. Get ready to lock in your answers!
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
        
        return (
            <div style={{ maxWidth: 900, margin: '2rem auto' }}>
                {/* Scoreboard */}
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#1e293b', color: '#fff' }}>
                    {gameState.players.map((p, i) => (
                        <div key={p.id || i} style={{ textAlign: i === 0 ? 'left' : 'right', borderBottom: p.id === (user.id || user._id) ? '3px solid var(--accent)' : 'none' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{p.name} {p.id === (user.id || user._id) && '(You)'}</div>
                            <div style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>{p.score} pts</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Q {p.currentQ + 1} / {gameState.questions.length}</div>
                        </div>
                    ))}
                </div>

                {/* Question Area */}
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Question {gameState.currentQ + 1} of {gameState.questions.length}</span>
                        <span style={{ color: timeElapsed > 10 ? 'var(--danger)' : 'var(--text-secondary)' }}>⏱️ {timeElapsed}s</span>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}><MathText text={q.question} /></h2>
                    
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
        <div className="card" style={{ maxWidth: 500, margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                {gameState.winnerId === null
                    ? '🤝 Draw'
                    : gameState.winnerId === (user.id || user._id)
                        ? '🎉 You Won!'
                        : '😔 You Lost'}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem 0' }}>
                {[...gameState.finalScores].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 8, border: p.id === (user.id || user._id) ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{i+1}. {p.name}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>{p.score} pts</span>
                    </div>
                ))}
            </div>
            <button className="btn btn-primary" onClick={() => setStatus('idle')} style={{ width: '100%' }}>Play Again</button>
        </div>
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
