import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { googleSignin, signin } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';
import GoogleAuthButton from '../components/GoogleAuthButton';

function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch {
        return {};
    }
}

export default function SignIn() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const signinSchema = z.object({
        email: z.string().email('Please enter a valid email address.'),
        password: z.string().min(6, 'Password must be at least 6 characters.'),
    });

    const handleChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
        setError('');
    };

    const handleGoogleCredential = async (credential) => {
        setError('');
        setGoogleLoading(true);
        try {
            const res = await googleSignin({ idToken: credential });
            const { token, user } = res.data;
            const payload = parseJwt(token);
            login(token, {
                id: user?.id || payload.id,
                role: user?.role || payload.role,
                email: user?.email || '',
                name: user?.name || '',
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in failed.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const parsed = signinSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path?.[0];
                if (field && !nextErrors[field]) nextErrors[field] = issue.message;
            }
            setFieldErrors(nextErrors);
            return;
        }
        setLoading(true);
        try {
            const res = await signin(form);
            const { token, user } = res.data;
            const payload = parseJwt(token);
            const userData = {
                id: user?.id || payload.id,
                role: user?.role || payload.role,
                email: user?.email || form.email,
                name: user?.name || '',
            };
            login(token, userData);
            navigate('/dashboard');
        } catch (err) {
            const code = err.response?.data?.code;
            const email = err.response?.data?.email || form.email;
            if (code === 'EMAIL_NOT_VERIFIED') {
                navigate(`/verify-email?email=${encodeURIComponent(email)}`);
                return;
            }
            setError(err.response?.data?.message || 'Sign in failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            background: 'var(--bg-base)',
            backgroundImage: 'var(--gradient-mesh)',
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="navbar-logo-icon" style={{
                        width: 56, height: 56, fontSize: '1.5rem',
                        margin: '0 auto 1rem',
                    }}>
                        <LogoIcon size={22} />
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
                        marginBottom: '0.5rem',
                    }}>
                        Welcome back
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Sign in to continue your learning journey
                    </p>
                </div>

                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2rem',
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                            ✕ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                className={`form-input${fieldErrors.email ? ' error' : ''}`}
                                type="email"
                                name="email"
                                id="signin-email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                            />
                            {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                className={`form-input${fieldErrors.password ? ' error' : ''}`}
                                type="password"
                                name="password"
                                id="signin-password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                            />
                            {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
                        </div>

                        <button
                            type="submit"
                            id="signin-submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading || googleLoading}
                            style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Signing in...' : 'Sign In ->'}
                        </button>
                    </form>

                    <div className="divider-text" style={{ margin: '1.5rem 0' }}>or</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GoogleAuthButton onCredential={handleGoogleCredential} disabled={loading || googleLoading} />
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1.25rem' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
