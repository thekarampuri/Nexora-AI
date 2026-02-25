// src/hooks/useAutomation.js

import { useState, useCallback } from 'react';
import { buildApiCall, getTagLabel } from '../utils/automationParser';

const PYTHON_SERVER_URL = '';

export const useAutomation = () => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const executeAutomation = useCallback(async (tags) => {
        if (!tags || tags.length === 0) return;

        setIsExecuting(true);
        let finalResult = null;

        for (const tag of tags) {
            const apiCall = buildApiCall(tag);
            const label = getTagLabel(tag);

            if (!apiCall) {
                console.warn('[Nexora] Skipping malformed or unknown tag', tag);
                continue;
            }

            try {
                console.log(`[EXECUTING]:`, apiCall.endpoint, apiCall.body);

                const response = await fetch(`${PYTHON_SERVER_URL}${apiCall.endpoint}`, {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiCall.body)
                });

                if (!response.ok) {
                    throw new Error(`Server returned status ${response.status}`);
                }

                const data = await response.json();

                finalResult = {
                    tagRaw: tag.raw,
                    status: data.error || data.status === 'error' ? 'error' : 'success',
                    data,
                    error: data.error || data.message
                };

                console.log(`[RESULT]:`, finalResult);

            } catch (err) {
                console.error(`[Nexora] Error executing ${label}:`, err);
                finalResult = {
                    tagRaw: tag.raw,
                    status: 'error',
                    data: null,
                    error: err.message
                };
            }
        }

        setLastResult(finalResult);
        setIsExecuting(false);
        return finalResult;
    }, []);

    return { executeAutomation, isExecuting, lastResult };
};
