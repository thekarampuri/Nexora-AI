// src/utils/automationParser.js

/**
 * Parses a string to extract all [AUTOMATION|...] tags and returns a cleaned string.
 * @param {string} text - The raw AI response text containing automation tags.
 * @returns {{ cleanText: string, tags: Array<{category: string, action: string, params: string[], raw: string}> }}
 */
export const parseAutomationTags = (text) => {
    if (!text) return { cleanText: '', tags: [] };

    const tags = [];
    // Matches [AUTOMATION|CATEGORY|ACTION|PARAMS...] ignoring whitespace/newlines
    const regex = /\[AUTOMATION\|([^\|\]]+)\|([^\|\]]+)\|?([^\]]*)\]/gi;

    let cleanText = text;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const raw = match[0];
        const category = match[1].trim().toUpperCase();
        const action = match[2].trim().toUpperCase();
        const paramsRaw = match[3].trim();

        // Params are often separated by ::
        const params = paramsRaw ? paramsRaw.split('::').map(p => p.trim()) : [];

        tags.push({ category, action, params, raw });
        // Strip out the tag from the text
        cleanText = cleanText.replace(raw, '');
    }

    // Clean up excessive newlines or spaces left behind by stripped tags
    cleanText = cleanText.replace(/\n\s*\n/g, '\n\n').trim();

    console.log('[PARSER]:', tags);
    return { cleanText, tags };
};

/**
 * Maps a parsed tag into a Python Server API endpoint and body.
 * @param {object} tag - The parsed tag object.
 * @returns {{ endpoint: string, body: object } | null}
 */
export const buildApiCall = (tag) => {
    const { category, action, params } = tag;

    try {
        if (category === 'APP' && action === 'OPEN') {
            return { endpoint: '/api/app/launch', body: { app_name: params[0] } };
        }
        if (category === 'WHATSAPP' && action === 'SEND') {
            return { endpoint: '/api/whatsapp/send', body: { contact: params[0], message: params[1] } };
        }
        if (category === 'MAIL' && action === 'SEND') {
            return { endpoint: '/api/mail/send', body: { recipient: params[0], subject: params[1], body: params[2] } };
        }
        if (category === 'MAIL' && action === 'OPEN') {
            return { endpoint: '/api/app/launch', body: { app_name: 'outlook' } }; // 'gmail' app might not exist locally, outlook or browser fallback
        }
        if (category === 'SEARCH' && action === 'GOOGLE') {
            return { endpoint: '/api/search', body: { engine: 'google', query: params[0] } };
        }
        if (category === 'SEARCH' && action === 'YOUTUBE') {
            return { endpoint: '/api/search', body: { engine: 'youtube', query: params[0] } };
        }
        if (category === 'MUSIC' && action === 'PLAY') {
            return { endpoint: '/api/music/play', body: { query: params[0] } };
        }
        if (category === 'MEDIA') {
            return { endpoint: '/api/media/control', body: { action: action.toLowerCase() } };
        }
        if (category === 'BROWSER' && action === 'OPEN') {
            return { endpoint: '/api/browser/open', body: { url: params[0] } };
        }
        if (category === 'SYSTEM' && action === 'VOLUME') {
            return { endpoint: '/api/system/volume', body: { action: params[0].toLowerCase(), value: parseInt(params[1]) || null } };
        }
        if (category === 'SYSTEM' && action === 'BRIGHTNESS') {
            return { endpoint: '/api/system/brightness', body: { action: params[0].toLowerCase(), value: parseInt(params[1]) || null } };
        }
        if (category === 'SYSTEM' && action === 'SCREENSHOT') {
            return { endpoint: '/api/system/screenshot', body: {} };
        }
        if (category === 'POWER') {
            return { endpoint: '/api/system/power', body: { action: action.toLowerCase() } };
        }
        if (category === 'DOCUMENT' && action === 'CREATE') {
            return { endpoint: '/api/document/create', body: { filename: params[0], content: params[1] || '' } };
        }
        if (category === 'FILE' && ['CREATE_FOLDER', 'CREATE_CODE', 'RENAME', 'DELETE', 'READ'].includes(action)) {
            return { endpoint: '/api/file/manager', body: { action: action.toLowerCase(), params: params } };
        }
        if (category === 'CLIPBOARD' && action === 'COPY') {
            return { endpoint: '/api/clipboard/copy', body: { text: params[0] } };
        }
        if (category === 'REMINDER' && action === 'SET') {
            return { endpoint: '/api/reminder/set', body: { title: params[0], datetime: params[1] } };
        }
        if (category === 'TRANSLATE' && action === 'TEXT') {
            return { endpoint: '/api/translate', body: { text: params[0], lang: params[1] || 'en' } };
        }
        if (category === 'WEATHER' && action === 'GET') {
            return { endpoint: '/api/weather', body: { city: params[0] } };
        }
        if (category === 'NEWS' && action === 'GET') {
            // Can be mapped to search or custom route if built
            return {
                endpoint: '/api/search', body: { engine: 'google', query: `news ${params[0] || ''}` }
            };
        }

        console.warn(`[Parser] Unmapped tag: ${category}|${action}`);
        return null;
    } catch (e) {
        console.error("[Parser] Error building API call for tag:", tag, e);
        return null; // Graceful skip on malformed params
    }
};

/**
 * Generates a human-friendly label for toast notifications based on the tag.
 * @param {object} tag - The parsed tag object.
 * @returns {string} 
 */
export const getTagLabel = (tag) => {
    const { category, action, params } = tag;

    const p0 = params[0] || '';

    switch (`${category}_${action}`) {
        case 'APP_OPEN': return `Opening ${p0}...`;
        case 'WHATSAPP_SEND': return `Sending WhatsApp to ${p0}...`;
        case 'MAIL_SEND': return `Sending email to ${p0}...`;
        case 'MAIL_OPEN': return `Opening Mail...`;
        case 'SEARCH_GOOGLE': return `Searching Google for "${p0}"...`;
        case 'SEARCH_YOUTUBE': return `Searching YouTube for "${p0}"...`;
        case 'MUSIC_PLAY': return `Playing "${p0}"...`;
        case 'MEDIA_PAUSE': return `Pausing media...`;
        case 'MEDIA_NEXT': return `Skipping to next track...`;
        case 'MEDIA_PREV': return `Going to previous track...`;
        case 'MEDIA_FULLSCREEN': return `Toggling fullscreen...`;
        case 'BROWSER_OPEN': return `Opening ${p0}...`;
        case 'SYSTEM_VOLUME': return `Adjusting volume (${p0})...`;
        case 'SYSTEM_BRIGHTNESS': return `Adjusting display brightness...`;
        case 'SYSTEM_SCREENSHOT': return `Saving screenshot to Desktop...`;
        case 'POWER_LOCK': return `Locking workstation...`;
        case 'POWER_SHUTDOWN': return `Shutting down PC...`;
        case 'POWER_SLEEP': return `Putting PC to sleep...`;
        case 'POWER_RESTART': return `Restarting workstation...`;
        case 'DOCUMENT_CREATE': return `Generating document ${p0}...`;
        case 'FILE_CREATE_FOLDER': return `Creating folder ${p0}...`;
        case 'FILE_CREATE_CODE': return `Saving code to ${p0}...`;
        case 'FILE_RENAME': return `Renaming file...`;
        case 'FILE_DELETE': return `Deleting ${p0}...`;
        case 'FILE_READ': return `Reading ${p0}...`;
        case 'CLIPBOARD_COPY': return `Copied text to clipboard`;
        case 'REMINDER_SET': return `Setting reminder: "${p0}"`;
        case 'TRANSLATE_TEXT': return `Translating text to ${params[1]}...`;
        case 'WEATHER_GET': return `Getting weather for ${p0}...`;
        case 'NEWS_GET': return `Fetching latest news...`;
        default: return `Executing ${category} automation...`;
    }
};
