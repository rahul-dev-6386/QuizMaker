import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotIcon, ChartIcon, KeyIcon, LogoIcon, QuizIcon, ShieldIcon } from '../components/Icons';

const FEATURES = [
    {
        icon: QuizIcon,
        title: 'Structured Assessments',
        desc: 'Create and attempt focused quizzes with a cleaner flow for practice, review, and repeat attempts.',
    },
    {
        icon: BotIcon,
        title: 'AI Answer Review',
        desc: 'Get concise explanations for missed questions so learners can understand mistakes faster.',
    },
    {
        icon: ChartIcon,
        title: 'Progress Visibility',
        desc: 'Track attempts, scores, and performance trends through a straightforward dashboard experience.',
    },
];

const PANEL_FEATURES = [
    { icon: ShieldIcon, label: 'Protected access with OTP verification' },
    { icon: KeyIcon, label: 'Long-lived sessions backed by refresh tokens' },
    { icon: ChartIcon, label: 'Clear performance visibility after every attempt' },
];

const SOCIAL_AVATARS = ['AL', 'RK', 'PM', 'DS'];

export default function LandingPage() {
    const fullAccentText = 'Improve with confidence.';
    const [typedAccent, setTypedAccent] = useState('');
    const [navScrolled, setNavScrolled] = useState(false);

    useEffect(() => {
        let frame;
        let index = 0;

        const tick = () => {
            index += 1;
            setTypedAccent(fullAccentText.slice(0, index));
            if (index < fullAccentText.length) {
                frame = window.setTimeout(tick, 45);
            }
        };

        frame = window.setTimeout(tick, 240);

        return () => window.clearTimeout(frame);
    }, []);

    useEffect(() => {
        const handleScroll = () => setNavScrolled(window.scrollY > 16);
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.16 }
        );

        const items = document.querySelectorAll('[data-reveal]');
        items.forEach((item) => observer.observe(item));

        return () => observer.disconnect();
    }, []);

    const navClassName = useMemo(
        () => `navbar landing-navbar${navScrolled ? ' landing-navbar-scrolled' : ''}`,
        [navScrolled]
    );

    return (
        <div className="landing-shell">
            <div className="page-noise" />
            <div className="landing-orb left" />
            <div className="landing-orb right" />
            <div className="landing-mesh" />
            <header className={navClassName}>
                <div className="navbar-inner">
                    <Link to="/" className="navbar-logo">
                        <div className="navbar-logo-icon" style={{ fontSize: '1rem' }}><LogoIcon size={16} /></div>
                        <span>QuizMaster</span>
                    </Link>
                    <div className="landing-nav-links">
                        <a href="#features" className="landing-nav-link active">Overview</a>
                        <a href="#features" className="landing-nav-link">Features</a>
                        <Link to="/signin" className="landing-nav-link">Sign In</Link>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Link to="/signup" className="btn btn-primary landing-cta-pill">Get Started</Link>
                    </div>
                </div>
            </header>

            <section className="landing-grid">
                <div className="landing-hero">
                    <div className="landing-panel landing-copy reveal-up is-visible">
                        <div className="eyebrow">Professional Quiz Platform</div>
                        <h1 className="landing-title">
                            Assess clearly.
                            <span className="landing-title-accent landing-title-accent-typed">
                                {typedAccent}
                                <span className="landing-caret" />
                            </span>
                        </h1>
                        <p className="landing-description">
                            QuizMaster is built for teams and learners who need a focused assessment experience,
                            secure account access, and clear feedback after every quiz attempt.
                        </p>

                        <div className="landing-actions">
                            <Link to="/signup" className="btn btn-primary btn-lg landing-glow-cta">
                                Get Started
                            </Link>
                            <Link to="/signin" className="btn btn-secondary btn-lg">
                                Sign In
                            </Link>
                        </div>

                        <div className="landing-social-proof">
                            <div className="landing-avatar-stack">
                                {SOCIAL_AVATARS.map((avatar) => (
                                    <span key={avatar} className="landing-avatar">{avatar}</span>
                                ))}
                            </div>
                            <span>Trusted by 10,000+ learners</span>
                        </div>

                        <div className="landing-meta">
                            <div className="landing-meta-card" data-reveal>
                                <div className="landing-feature-icon"><ShieldIcon size={18} /></div>
                                <div className="landing-meta-value">Secure</div>
                                <div className="landing-meta-label">OTP-based signup and recovery</div>
                            </div>
                            <div className="landing-meta-card" data-reveal>
                                <div className="landing-feature-icon"><QuizIcon size={18} /></div>
                                <div className="landing-meta-value">Clear</div>
                                <div className="landing-meta-label">Simple quiz and review workflow</div>
                            </div>
                            <div className="landing-meta-card" data-reveal>
                                <div className="landing-feature-icon"><ChartIcon size={18} /></div>
                                <div className="landing-meta-value">Trackable</div>
                                <div className="landing-meta-label">Results, attempts, and progress insight</div>
                            </div>
                        </div>
                    </div>

                    <div className="landing-panel landing-side reveal-up" data-reveal>
                        <div className="landing-side-card landing-glass-card">
                            <div className="badge badge-success landing-glow-badge">Built For Reliable Usage</div>
                            <div className="landing-side-title" style={{ marginTop: '1rem', fontSize: '1.4rem' }}>
                                A more credible frontend for real assessment workflows
                            </div>
                            <p className="landing-side-copy">
                                The platform focuses on the essentials: secure authentication, quiz delivery,
                                review after submission, and progress visibility without unnecessary product noise.
                            </p>
                            <div className="landing-checklist">
                                {PANEL_FEATURES.map((item) => (
                                    <div key={item.label} className="landing-check">
                                        <span className="landing-check-icon"><item.icon size={16} /></span>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="landing-side-card landing-side-card-soft">
                            <div className="landing-side-title">Designed to stay readable and calm</div>
                            <p className="landing-side-copy">
                                The interface is kept intentionally restrained so users can move from login to quiz to review
                                without distraction on desktop or mobile.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-feature-section" id="features">
                <div className="landing-feature-frame reveal-up" data-reveal>
                    <div style={{ maxWidth: '640px' }}>
                        <div className="eyebrow">Core Capabilities</div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginTop: '1rem' }}>
                            Only the features that matter most
                        </h2>
                        <p style={{ marginTop: '0.9rem', color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.75 }}>
                            QuizMaster is positioned around a smaller set of product strengths instead of a long feature list:
                            secure access, structured assessments, and useful post-quiz review.
                        </p>
                    </div>

                    <div className="landing-feature-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="landing-feature-card" data-reveal>
                                <div className="landing-feature-icon landing-feature-icon-lg">
                                    <f.icon size={20} />
                                </div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer style={{
                padding: '3rem 1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.35)',
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
