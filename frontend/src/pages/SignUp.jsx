import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { requestSignupOtp, verifySignupOtp } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';

const AUTH_POINTS = [
    'OTP verification before account activation',
    'Professional study flow with cookie-based sessions',
    'Designed to stay readable across mobile and desktop',
];

export default function SignUp() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [apiSuccess, setApiSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const signupSchema = z
        .object({
            name: z.string().trim().min(3, 'Name must be at least 3 characters.'),
            email: z.string().email('Enter a valid email address.'),
            password: z
                .string()
                .min(6, 'Password must be at least 6 characters.')
                .regex(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
                    'Must include uppercase, lowercase, number and special character.'
                ),
            confirm: z.string(),
        })
        .superRefine((data, ctx) => {
            if (data.password !== data.confirm) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['confirm'],
                    message: 'Passwords do not match.',
                });
            }
        });

    const handleChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setErrors((p) => ({ ...p, [e.target.name]: '' }));
        setApiError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        setApiSuccess('');

        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
            const mapped = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path?.[0];
                if (field && !mapped[field]) mapped[field] = issue.message;
            }
            setErrors(mapped);
            return;
        }

        setLoading(true);
        try {
            await requestSignupOtp({
                name: form.name.trim(),
                email: form.email,
                password: form.password,
            });
            setOtpSent(true);
            setApiSuccess('OTP sent to your email. Enter it below to complete signup.');
        } catch (err) {
            setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setApiError('');
        setApiSuccess('');

        if (otp.trim().length !== 6) {
            setErrors((p) => ({ ...p, otp: 'Enter the 6-digit OTP.' }));
            return;
        }

        setLoading(true);
        try {
            const res = await verifySignupOtp({
                email: form.email.trim(),
                otp: otp.trim(),
            });
            login(res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setApiError(err.response?.data?.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = () => {
        const p = form.password;
        if (!p) return { level: 0, label: '', color: '' };
        let score = 0;
        if (p.length >= 6) score++;
        if (p.length >= 10) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[@$!%*?&]/.test(p)) score++;
        if (score <= 2) return { level: score, label: 'Weak', color: 'var(--danger)' };
        if (score <= 3) return { level: score, label: 'Fair', color: 'var(--warning)' };
        return { level: score, label: 'Strong', color: 'var(--success)' };
    };

    const strength = passwordStrength();

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
                            {otpSent ? 'Verify and activate your account.' : 'Create a more secure quiz workspace.'}
                        </h1>
                        <p className="auth-brand-copy">
                            {otpSent
                                ? 'The account details are saved. Enter the OTP from your inbox to finish activation and start using the platform.'
                                : 'Set up your account with a stronger onboarding flow built around email verification, clear navigation, and reliable session handling.'}
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
                        <div className="auth-panel-kicker">{otpSent ? 'Verify Identity' : 'New Account'}</div>
                        <h2 className="auth-panel-title">{otpSent ? 'Verify your OTP' : 'Create your account'}</h2>
                        <p className="auth-panel-copy">
                            {otpSent ? 'Enter the six-digit code sent to your email to complete signup.' : 'Start with your details below. We will send an OTP before activating the account.'}
                        </p>
                    </div>

                    <div className="auth-panel-card">
                    {apiError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>✕ {apiError}</div>}
                    {apiSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{apiSuccess}</div>}

                    {!otpSent ? (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className={`form-input${errors.name ? ' error' : ''}`}
                                    type="text" name="name" id="signup-name"
                                    placeholder="Enter your full name" value={form.name} onChange={handleChange} />
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className={`form-input${errors.email ? ' error' : ''}`}
                                    type="email" name="email" id="signup-email"
                                    placeholder="Enter your email" value={form.email} onChange={handleChange} />
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className={`form-input${errors.password ? ' error' : ''}`}
                                    type="password" name="password" id="signup-password"
                                    placeholder="Create a strong password" value={form.password} onChange={handleChange} />
                                {form.password && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} style={{
                                                    height: 4, flex: 1, borderRadius: 'var(--radius-full)',
                                                    background: i <= strength.level ? strength.color : 'var(--bg-elevated)',
                                                    transition: 'var(--transition)',
                                                }} />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: strength.color }}>{strength.label}</span>
                                    </div>
                                )}
                                {errors.password && <span className="form-error">{errors.password}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input className={`form-input${errors.confirm ? ' error' : ''}`}
                                    type="password" name="confirm" id="signup-confirm"
                                    placeholder="Repeat your password" value={form.confirm} onChange={handleChange} />
                                {errors.confirm && <span className="form-error">{errors.confirm}</span>}
                            </div>

                            <button type="submit" id="signup-submit" className="btn btn-primary btn-lg"
                                disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                                {loading ? 'Sending OTP...' : 'Create Account & Send OTP ->'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                            <div className="form-group">
                                <label className="form-label">Verification OTP</label>
                                <input
                                    className={`form-input${errors.otp ? ' error' : ''}`}
                                    type="text"
                                    value={otp}
                                    placeholder="Enter 6-digit OTP"
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        setErrors((p) => ({ ...p, otp: '' }));
                                    }}
                                />
                                {errors.otp && <span className="form-error">{errors.otp}</span>}
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg"
                                disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                                {loading ? 'Verifying OTP...' : 'Verify OTP & Continue ->'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={loading}
                                onClick={handleSubmit}
                            >
                                Resend OTP
                            </button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1.25rem' }}>
                        Already have an account?{' '}
                        <Link to="/signin" className="auth-link-muted">
                            Sign in
                        </Link>
                    </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
