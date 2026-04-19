import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestAdminOtp, verifyAdminOtp } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminAuth() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState('key'); // 'key' | 'otp'
    const [key, setKey] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!key.trim()) {
            setError('Please enter the admin access key.');
            return;
        }

        setLoading(true);
        try {
            const res = await requestAdminOtp({ key: key.trim() });
            setSuccess(res.data.message || 'OTP sent to the platform administrator.');
            setStep('otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Invalid key.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Please enter a valid 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            const res = await verifyAdminOtp({ key: key.trim(), otp: otp.trim() });
            login(res.data.user);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed.');
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
                        background: 'linear-gradient(135deg, var(--danger), #ff8a65)'
                    }}>
                        🔐
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700,
                        marginBottom: '0.5rem',
                    }}>
                        Admin Authentication
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Enter the secure key to access the admin panel
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
                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                            ✓ {success}
                        </div>
                    )}

                    {step === 'key' ? (
                        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Access Key</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Enter admin key..."
                                    value={key}
                                    onChange={(e) => {
                                        setKey(e.target.value);
                                        setError('');
                                    }}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    marginTop: '0.5rem',
                                    background: 'linear-gradient(135deg, var(--danger), #ff8a65)'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: 16, height: 16 }} />
                                        Verifying Key…
                                    </>
                                ) : 'Continue →'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Security Code (OTP)</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Enter 6-digit code..."
                                    value={otp}
                                    maxLength={6}
                                    onChange={(e) => {
                                        setOtp(e.target.value);
                                        setError('');
                                    }}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    marginTop: '0.5rem',
                                    background: 'linear-gradient(135deg, var(--danger), #ff8a65)'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: 16, height: 16 }} />
                                        Authenticating…
                                    </>
                                ) : 'Gain Access →'}
                            </button>
                            
                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setStep('key')}
                                >
                                    ← Back to Key Entry
                                </button>
                            </div>
                        </form>
                    )}

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('/dashboard')}
                        >
                            ← Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
