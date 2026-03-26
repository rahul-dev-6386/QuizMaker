import React from 'react';

function Svg({ children, size = 18, stroke = 1.8 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

export function LogoIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M9 15l2-6 2 4 2-4 1 6" />
        </Svg>
    );
}

export function DashboardIcon({ size = 16 }) {
    return (
        <Svg size={size}>
            <rect x="3" y="3" width="8" height="8" rx="1.5" />
            <rect x="13" y="3" width="8" height="5" rx="1.5" />
            <rect x="13" y="10" width="8" height="11" rx="1.5" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </Svg>
    );
}

export function QuizIcon({ size = 16 }) {
    return (
        <Svg size={size}>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
        </Svg>
    );
}

export function BotIcon({ size = 16 }) {
    return (
        <Svg size={size}>
            <rect x="4" y="7" width="16" height="12" rx="3" />
            <path d="M9 11h.01M15 11h.01M8 15h8M12 3v4" />
        </Svg>
    );
}

export function SunIcon({ size = 16 }) {
    return (
        <Svg size={size}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </Svg>
    );
}

export function MoonIcon({ size = 16 }) {
    return (
        <Svg size={size}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z" />
        </Svg>
    );
}

export function ChartIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <path d="M4 19h16" />
            <path d="M7 15V9M12 15V5M17 15v-3" />
        </Svg>
    );
}

export function ShieldIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <path d="M12 3l7 3v5c0 4.5-2.8 7.6-7 10-4.2-2.4-7-5.5-7-10V6l7-3Z" />
            <path d="m9.5 12 1.8 1.8 3.7-4" />
        </Svg>
    );
}

export function KeyIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <circle cx="8" cy="15" r="3" />
            <path d="M10.5 13.5 20 4" />
            <path d="M17 4h3v3" />
            <path d="M15 6l3 3" />
        </Svg>
    );
}

export function TrophyIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
            <path d="M6 6H4a2 2 0 0 0 2 3M18 6h2a2 2 0 0 1-2 3M12 11v4M9 19h6" />
        </Svg>
    );
}

export function TargetIcon({ size = 18 }) {
    return (
        <Svg size={size}>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1.5" />
        </Svg>
    );
}
