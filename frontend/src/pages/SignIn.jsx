import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { requestForgotPasswordOtp, resetForgotPassword, signin } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';

const AUTH_POINTS = [
    'Secure sign-in with refresh-token sessions',
    'OTP-based password recovery when you need it',
    'A responsive workspace that stays clean on mobile',
];

export default function SignIn() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [resetForm, setResetForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [resetErrors, setResetErrors] = useState({});
    const [error, setError] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [resetOtpSent, setResetOtpSent] = useState(false);

    const signinSchema = z.object({
        email: z.string().email('Please enter a valid email address.'),
        password: z.string().min(6, 'Password must be at least 6 characters.'),
    });

    const resetSchema = z.object({
        email: z.string().email('Please enter a valid email address.'),
        otp: z.string().length(6, 'OTP must be 6 digits.'),
        newPassword: z
            .string()
            .min(6, 'Password must be at least 6 characters.')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
                'Must include uppercase, lowercase, number and special character.'
            ),
        confirmPassword: z.string(),
    }).superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: 'Passwords do not match.',
            });
        }
    });

    const handleChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
        setError('');
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
            login(res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Sign in failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotRequest = async () => {
        const email = resetForm.email.trim();
        if (!email) {
            setResetErrors({ email: 'Email is required.' });
            return;
        }

        try {
            setLoading(true);
            setForgotMessage('');
            setResetErrors({});
            await requestForgotPasswordOtp({ email });
            setResetOtpSent(true);
            setForgotMessage('If the account exists, an OTP has been sent to the registered email address.');
        } catch (err) {
            setForgotMessage('');
            setResetErrors({ email: err.response?.data?.message || 'Failed to send OTP.' });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotMessage('');

        const parsed = resetSchema.safeParse(resetForm);
        if (!parsed.success) {
            const nextErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path?.[0];
                if (field && !nextErrors[field]) nextErrors[field] = issue.message;
            }
            setResetErrors(nextErrors);
            return;
        }

        try {
            setLoading(true);
            const res = await resetForgotPassword({
                email: resetForm.email.trim(),
                otp: resetForm.otp.trim(),
                newPassword: resetForm.newPassword,
            });
            login(res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setForgotMessage('');
            setResetErrors({
                otp: err.response?.data?.message || 'Failed to reset password.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="page-noise" />
            <div className="auth-layout">
                <section className="auth-brand">
                    <div className="auth-brand-top">
                        <div className="auth-brand-mark">
                            <div className="navbar-logo-icon"><LogoIcon size={18} /></div>
                            <span>QuizMaster</span>
                        </div>
                        <h1 className="auth-brand-title">
                            {forgotMode ? 'Reset access without friction.' : 'Welcome back to focused learning.'}
                        </h1>
                        <p className="auth-brand-copy">
                            {forgotMode
                                ? 'Request a one-time password, verify ownership of the account, and set a fresh password without leaving the flow.'
                                : 'Pick up where you left off with a calmer interface, secure cookie sessions, and analytics that make each attempt count.'}
                        </p>
                    </div>

                    <div className="auth-brand-bottom">
                        <div className="auth-brand-points">
                            {AUTH_POINTS.map((point) => (
                                <div key={point} className="auth-brand-point">
                                    <span className="auth-brand-chip">+</span>
                                    <span>{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="auth-panel">
                    <div className="auth-panel-header">
                        <div className="auth-panel-kicker">{forgotMode ? 'Recovery Flow' : 'Account Access'}</div>
                        <h2 className="auth-panel-title">{forgotMode ? 'Reset your password' : 'Sign in'}</h2>
                        <p className="auth-panel-copy">
                            {forgotMode ? 'Use the OTP flow below to secure your account and set a new password.' : 'Use your email and password to continue into the dashboard.'}
                        </p>
                    </div>

                    <div className="auth-panel-card">
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                            ✕ {error}
                        </div>
                    )}
                    {forgotMessage && forgotMode && (
                        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                            {forgotMessage}
                        </div>
                    )}

                    {!forgotMode ? (
                        <>
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
                                    disabled={loading}
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                >
                                    {loading ? 'Signing in...' : 'Sign In ->'}
                                </button>
                            </form>

                            <div className="auth-inline-footer">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setForgotMode(true);
                                        setError('');
                                        setForgotMessage('');
                                    }}
                                >
                                    Forgot password?
                                </button>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="auth-link-muted">
                                        Create one free
                                    </Link>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        className={`form-input${resetErrors.email ? ' error' : ''}`}
                                        type="email"
                                        placeholder="Enter your email"
                                        value={resetForm.email}
                                        onChange={(e) => {
                                            setResetForm((p) => ({ ...p, email: e.target.value }));
                                            setResetErrors((p) => ({ ...p, email: '' }));
                                        }}
                                    />
                                    {resetErrors.email && <span className="form-error">{resetErrors.email}</span>}
                                </div>

                                <button type="button" className="btn btn-secondary" onClick={handleForgotRequest} disabled={loading}>
                                    {loading ? 'Sending OTP...' : resetOtpSent ? 'Resend OTP' : 'Send OTP'}
                                </button>

                                <div className="form-group">
                                    <label className="form-label">OTP Code</label>
                                    <input
                                        className={`form-input${resetErrors.otp ? ' error' : ''}`}
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={resetForm.otp}
                                        onChange={(e) => {
                                            setResetForm((p) => ({ ...p, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }));
                                            setResetErrors((p) => ({ ...p, otp: '' }));
                                        }}
                                    />
                                    {resetErrors.otp && <span className="form-error">{resetErrors.otp}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        className={`form-input${resetErrors.newPassword ? ' error' : ''}`}
                                        type="password"
                                        placeholder="Create a new password"
                                        value={resetForm.newPassword}
                                        onChange={(e) => {
                                            setResetForm((p) => ({ ...p, newPassword: e.target.value }));
                                            setResetErrors((p) => ({ ...p, newPassword: '' }));
                                        }}
                                    />
                                    {resetErrors.newPassword && <span className="form-error">{resetErrors.newPassword}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input
                                        className={`form-input${resetErrors.confirmPassword ? ' error' : ''}`}
                                        type="password"
                                        placeholder="Repeat the new password"
                                        value={resetForm.confirmPassword}
                                        onChange={(e) => {
                                            setResetForm((p) => ({ ...p, confirmPassword: e.target.value }));
                                            setResetErrors((p) => ({ ...p, confirmPassword: '' }));
                                        }}
                                    />
                                    {resetErrors.confirmPassword && <span className="form-error">{resetErrors.confirmPassword}</span>}
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                                    {loading ? 'Resetting password...' : 'Verify OTP & Reset ->'}
                                </button>
                            </form>

                            <div style={{ marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setForgotMode(false);
                                        setForgotMessage('');
                                        setResetErrors({});
                                    }}
                                >
                                    Back to sign in
                                </button>
                            </div>
                        </>
                    )}
                    </div>
                </section>
            </div>
        </div>
    );
}
