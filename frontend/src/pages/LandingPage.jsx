import React from 'react';
import { Link } from 'react-router-dom';
import { BotIcon, ChartIcon, LogoIcon, QuizIcon, TrophyIcon } from '../components/Icons';

const FEATURES = [
    {
        icon: QuizIcon,
        title: 'Adaptive Testing',
        desc: 'Dynamically generated assessments that adapt to your knowledge level across diverse categories.',
    },
    {
        icon: BotIcon,
        title: 'AI-Powered Insights',
        desc: 'Receive immediate, detailed explanations for incorrect answers powered by Google Gemini.',
    },
    {
        icon: TrophyIcon,
        title: 'Global Leaderboards',
        desc: 'Track your performance and benchmark your scores against learners worldwide.',
    },
    {
        icon: ChartIcon,
        title: 'Performance Analytics',
        desc: 'Visualize your progress over time with comprehensive dashboard statistics and attempt histories.',
    },
];

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ——— Header ——— */}
            <header className="navbar" style={{ position: 'static' }}>
                <div className="navbar-inner">
                    <Link to="/" className="navbar-logo">
                        <div className="navbar-logo-icon" style={{ fontSize: '1rem' }}><LogoIcon size={16} /></div>
                        <span>QuizMaster</span>
                    </Link>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Link to="/signin" className="btn btn-ghost" style={{ fontWeight: 600 }}>Sign In</Link>
                        <Link to="/signup" className="btn btn-primary">Get Started</Link>
                    </div>
                </div>
            </header>

            {/* ——— Hero Section ——— */}
            <section style={{
                padding: '6rem 1.5rem',
                textAlign: 'center',
                background: 'var(--bg-base)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <div className="badge badge-primary" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        Enterprise-Grade Assessment Platform
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        marginBottom: '1.5rem',
                        color: 'var(--text-primary)'
                    }}>
                        Assess Knowledge with
                        <span style={{ color: 'var(--primary)' }}> Intelligent Precision</span>
                    </h1>
                    <p style={{
                        fontSize: '1.125rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '2.5rem',
                        lineHeight: 1.7,
                        maxWidth: '600px',
                        margin: '0 auto 2.5rem'
                    }}>
                        A robust testing environment combining rigorous question banks with immediate AI-driven feedback to accelerate professional learning and development.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link to="/signup" className="btn btn-primary btn-lg" style={{ fontSize: '1.125rem', padding: '1rem 2.5rem' }}>
                            Create Free Account
                        </Link>
                        <Link to="/signin" className="btn btn-secondary btn-lg" style={{ fontSize: '1.125rem', padding: '1rem 2.5rem' }}>
                            Log In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ——— Features Section ——— */}
            <section style={{ padding: '6rem 1.5rem', background: 'var(--bg-subtle)', flex: 1 }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                            Comprehensive Testing Architecture
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
                            Built for educators, professionals, and avid learners who demand accuracy and actionable analytics.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2rem'
                    }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <f.icon size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                    {f.title}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                    {f.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ——— Footer ——— */}
            <footer style={{
                padding: '3rem 1.5rem',
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                textAlign: 'center',
                color: 'var(--text-muted)'
            }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div className="navbar-logo-icon" style={{ width: 24, height: 24, fontSize: '0.75rem' }}><LogoIcon size={12} /></div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>QuizMaster</span>
                    </div>
                    <p style={{ fontSize: '0.875rem' }}>© 2026 QuizMaster Technologies. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
