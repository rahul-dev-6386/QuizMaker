import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { signup, signin } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';

function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch { return {}; }
}

export default function SignUp() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

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
            await signup({
                name: form.name.trim(),
                email: form.email,
                password: form.password,
            });
            // Auto sign-in after signup
            const res = await signin({ email: form.email, password: form.password });
            const { token } = res.data;
            const payload = parseJwt(token);
            login(token, { id: payload.id, role: payload.role, name: form.name.trim(), email: form.email });
            navigate('/dashboard');
        } catch (err) {
            setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
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
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            background: 'var(--bg-base)',
            backgroundImage: 'var(--gradient-mesh)',
        }}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="navbar-logo-icon" style={{
                        width: 56, height: 56, fontSize: '1.5rem',
                        margin: '0 auto 1rem',
                    }}><LogoIcon size={22} /></div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Create your account
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Join QuizMaster and start your learning journey today
                    </p>
                </div>

                <div style={{
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-lg)',
                }}>
                    {apiError && (
                        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                            ✕ {apiError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className={`form-input${errors.name ? ' error' : ''}`}
                                type="text" name="name" id="signup-name"
                                placeholder="Enter your full name" value={form.name} onChange={handleChange} />
                            {errors.name && <span className="form-error">⚠ {errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className={`form-input${errors.email ? ' error' : ''}`}
                                type="email" name="email" id="signup-email"
                                placeholder="Enter your email" value={form.email} onChange={handleChange} />
                            {errors.email && <span className="form-error">⚠ {errors.email}</span>}
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
                            {errors.password && <span className="form-error">⚠ {errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input className={`form-input${errors.confirm ? ' error' : ''}`}
                                type="password" name="confirm" id="signup-confirm"
                                placeholder="Repeat your password" value={form.confirm} onChange={handleChange} />
                            {errors.confirm && <span className="form-error">⚠ {errors.confirm}</span>}
                        </div>

                        <button type="submit" id="signup-submit" className="btn btn-primary btn-lg"
                            disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                            {loading ? (
                                <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating account…</>
                            ) : 'Create Account →'}
                        </button>
                    </form>

                    <div className="divider-text" style={{ margin: '1.5rem 0' }}>or</div>

                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Already have an account?{' '}
                        <Link to="/signin" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
