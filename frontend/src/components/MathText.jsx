import React from 'react';
import katex from 'katex';

function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderMixedMath(input) {
    if (!input) return '';
    const text = String(input);
    const tokenRegex = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g;
    const tokens = text.split(tokenRegex).filter(Boolean);

    if (tokens.length === 1 && /\\[a-zA-Z]+/.test(text) && !text.includes('$')) {
        try {
            return katex.renderToString(text, { throwOnError: false, displayMode: false });
        } catch {
            return escapeHtml(text);
        }
    }

    return tokens
        .map((token) => {
            if (token.startsWith('$$') && token.endsWith('$$')) {
                const expr = token.slice(2, -2).trim();
                try {
                    return katex.renderToString(expr, { throwOnError: false, displayMode: true });
                } catch {
                    return escapeHtml(token);
                }
            }
            if (token.startsWith('$') && token.endsWith('$')) {
                const expr = token.slice(1, -1).trim();
                try {
                    return katex.renderToString(expr, { throwOnError: false, displayMode: false });
                } catch {
                    return escapeHtml(token);
                }
            }
            return escapeHtml(token).replaceAll('\n', '<br/>');
        })
        .join('');
}

export default function MathText({ text, style }) {
    return <span style={style} dangerouslySetInnerHTML={{ __html: renderMixedMath(text) }} />;
}
