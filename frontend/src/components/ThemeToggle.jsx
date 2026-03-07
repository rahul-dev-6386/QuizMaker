import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';

export default function ThemeToggle({ fixed = true }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={fixed ? { position: 'fixed', right: 16, top: 16, zIndex: 250 } : undefined}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
    );
}

