import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardIcon, LogoIcon, QuizIcon } from './Icons';

const NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/quizzes', label: 'Quizzes', icon: QuizIcon },
];

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setDropdownOpen(false);
    };

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo */}
                <Link to="/dashboard" className="navbar-logo">
                    <div className="navbar-logo-icon"><LogoIcon size={16} /></div>
                    <span>QuizMaster</span>
                </Link>

                {/* Nav Links */}
                <ul className="navbar-nav">
                    {NAV_ITEMS.map((item) => (
                        <li key={item.path}>
                            <Link
                                to={item.path}
                                className={location.pathname === item.path ? 'active' : ''}
                            >
                                <item.icon size={15} />
                                {item.label}
                            </Link>
                        </li>
                    ))}
                    {isAdmin && (
                        <li>
                            <Link
                                to="/admin"
                                className={location.pathname === '/admin' ? 'active' : ''}
                            >
                                <QuizIcon size={15} />
                                Add Quiz
                            </Link>
                        </li>
                    )}
                </ul>

                {/* User Menu */}
                <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className="user-avatar"
                            onClick={() => setDropdownOpen((v) => !v)}
                            role="button"
                            title={user?.name}
                        >
                            {initials}
                        </div>

                        {dropdownOpen && (
                            <div className="user-dropdown">
                                <div className="user-dropdown-header">
                                    <div className="user-dropdown-name">{user?.name}</div>
                                    <div className="user-dropdown-role">
                                        {user?.role === 'admin' ? 'Administrator' : 'Member'}
                                    </div>
                                </div>
                                <div
                                    className="user-dropdown-item"
                                    onClick={() => { navigate('/dashboard'); setDropdownOpen(false); }}
                                >
                                    Dashboard
                                </div>
                                <div
                                    className="user-dropdown-item"
                                    onClick={() => { navigate('/quizzes'); setDropdownOpen(false); }}
                                >
                                    Quizzes
                                </div>
                                {isAdmin ? (
                                    <div
                                        className="user-dropdown-item"
                                        onClick={() => { navigate('/admin'); setDropdownOpen(false); }}
                                    >
                                        Add Quiz
                                    </div>
                                ) : (
                                    <div
                                        className="user-dropdown-item"
                                        onClick={() => { navigate('/admin-auth'); setDropdownOpen(false); }}
                                    >
                                        Admin Access
                                    </div>
                                )}
                                <div className="divider" style={{ margin: '0.25rem 0' }} />
                                <div className="user-dropdown-item danger" onClick={handleLogout}>
                                    Sign Out
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
