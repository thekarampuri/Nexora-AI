export const parseCommand = (text) => {
    const lower = text.toLowerCase();

    // --- UI WIDGET TRIGGERS ONLY ---
    // These commands trigger React frontend components directly.
    // All other commands (system, media, web, automation) will return null 
    // and fall through to the AI Core which will generate the appropriate tags.

    // Explicit matches for "open / show"
    const openMatch = lower.match(/(?:open|show) (application )?(.+)/);
    if (openMatch) {
        const target = openMatch[2].trim();
        if (target.includes('weather')) return { type: 'ui', component: 'weather' };
        if (target.includes('news')) return { type: 'ui', component: 'news' };
        if (target.includes('clock') || target.includes('time')) return { type: 'ui', component: 'clock' };
    }

    // Direct exact keyword fallbacks for UI (keep strict to avoid intercepting conversational tasks)
    if (escape(lower) === 'weather' || lower === 'show weather') return { type: 'ui', component: 'weather' };
    if (escape(lower) === 'news' || lower === 'show news') return { type: 'ui', component: 'news' };

    return null; // No matching local UI command found -> Route to AI Chat
};

