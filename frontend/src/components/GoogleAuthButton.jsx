import React, { useEffect, useRef } from 'react';

export default function GoogleAuthButton({ onCredential, disabled = false }) {
    const buttonRef = useRef(null);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!clientId || !window.google?.accounts?.id || !buttonRef.current) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
                if (response?.credential && onCredential) {
                    onCredential(response.credential);
                }
            },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
        });
    }, [clientId, onCredential]);

    if (!clientId) {
        return (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                Google sign-in is unavailable. Set <code>VITE_GOOGLE_CLIENT_ID</code>.
            </p>
        );
    }

    return (
        <div style={{ opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <div ref={buttonRef} />
        </div>
    );
}
