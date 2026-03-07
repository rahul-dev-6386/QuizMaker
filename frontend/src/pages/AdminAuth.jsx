import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateAdmin } from '../api';
import { useAuth } from '../context/AuthContext';

function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch { return {}; }
}

export default function AdminAuth() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!key.trim()) {
            setError('Please enter the admin access key.');
            return;
        }

        setLoading(true);
        try {
            const res = await authenticateAdmin({ key: key.trim() });
            const { token, user: updatedUser } = res.data;

            // Re-login with the new admin token
            const payload = parseJwt(token);
            login(token, {
                id: payload.id,
                role: payload.role,
                name: updatedUser.name,
                email: updatedUser.email
            });

            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Invalid key.');
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

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                                    Authenticating…
                                </>
                            ) : 'Gain Access →'}
                        </button>
                    </form>

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
