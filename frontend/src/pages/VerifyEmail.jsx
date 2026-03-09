import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendOtp, verifyOtp } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';

function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return {};
    }
}

export default function VerifyEmail() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { search } = useLocation();
    const initialEmail = useMemo(() => new URLSearchParams(search).get('email') || '', [search]);

    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email || otp.length !== 6) {
            setError('Enter email and 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            const res = await verifyOtp({ email, otp });
            const { token, user } = res.data;
            const payload = parseJwt(token);
            login(token, {
                id: user?.id || payload.id,
                role: user?.role || payload.role,
                name: user?.name || '',
                email: user?.email || email,
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setSuccess('');
        if (!email) {
            setError('Enter your email to resend OTP.');
            return;
        }
        setResendLoading(true);
        try {
            const res = await resendOtp({ email });
            const debugOtp = res.data?.debugOtp;
            setSuccess(debugOtp ? `OTP sent. Dev OTP: ${debugOtp}` : 'OTP sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            background: 'var(--bg-base)', backgroundImage: 'var(--gradient-mesh)',
        }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="navbar-logo-icon" style={{ width: 56, height: 56, margin: '0 auto 1rem' }}>
                        <LogoIcon size={22} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}>Verify your email</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Enter OTP to activate your account.</p>
                </div>

                <div style={{
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-lg)',
                }}>
                    {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>✕ {error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

                    <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            className="form-input"
                            type="text"
                            placeholder="6-digit OTP"
                            value={otp}
                            maxLength={6}
                            onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                        />
                        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>

                    <button
                        className="btn btn-secondary"
                        type="button"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        onClick={handleResend}
                        disabled={resendLoading}
                    >
                        {resendLoading ? 'Sending...' : 'Resend OTP'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        Back to <Link to="/signin">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
