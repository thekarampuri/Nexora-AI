export const parseCommand = (text) => {
    const lower = text.toLowerCase();

    // --- SYSTEM CONTROLS ---
    if (lower.includes('volume up') || lower.includes('increase volume')) return { type: 'system', action: 'up' };
    if (lower.includes('volume down') || lower.includes('decrease volume')) return { type: 'system', action: 'down' };
    if (lower.includes('mute') || lower.includes('silence')) return { type: 'system', action: 'mute' };

    // --- MEDIA CONTROLS ---
    if (lower.includes('pause music') || lower.includes('pause video')) return { type: 'media', action: 'pause' };
    if (lower.includes('resume music') || lower.includes('play music')) return { type: 'media', action: 'play' };
    if (lower.includes('next song') || lower.includes('next track')) return { type: 'media', action: 'next' };

    // --- APP LAUNCHING ---
    // Matches "open [app name]"
    const openMatch = lower.match(/open (application )?(.+)/);
    if (openMatch) {
        const target = openMatch[2].trim();

        // Specific UI Features
        if (target.includes('weather')) return { type: 'ui', component: 'weather' };
        if (target.includes('news')) return { type: 'ui', component: 'news' };
        if (target.includes('clock') || target.includes('time')) return { type: 'ui', component: 'clock' };

        // Websites
        if (target.includes('youtube')) return { type: 'web', url: 'youtube.com' };
        if (target.includes('google')) return { type: 'web', url: 'google.com' };
        if (target.includes('whatsapp')) return { type: 'web', url: 'web.whatsapp.com' };
        if (target.includes('instagram') || target.includes('insta')) return { type: 'web', url: 'instagram.com' };

        // Default to system app
        return { type: 'app', app_name: target };
    }

    // --- SPECIFIC QUERIES ---
    if (lower.includes('battery') || lower.includes('power status')) return { type: 'system', action: 'battery' };
    if (lower.includes('time') || lower.includes('date')) return { type: 'ui', component: 'clock' };
    if (lower.includes('weather')) return { type: 'ui', component: 'weather' };
    if (lower.includes('news')) return { type: 'ui', component: 'news' };

    return null; // No command found -> General Chat
};
