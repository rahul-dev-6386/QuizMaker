import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, logoutSession } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const bootstrapAuth = async () => {
            try {
                const res = await getCurrentUser();
                if (mounted) setUser(res.data.user || null);
            } catch {
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        bootstrapAuth();

        const handleExpired = () => {
            if (mounted) setUser(null);
        };

        window.addEventListener('auth:expired', handleExpired);

        return () => {
            mounted = false;
            window.removeEventListener('auth:expired', handleExpired);
        };
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await logoutSession();
        } catch {
            // Ignore logout API errors and still clear local state.
        }
        setUser(null);
    };

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
