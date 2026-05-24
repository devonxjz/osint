// backend/username/engines/apiEngine.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiEngine = exports.ApiEngine = void 0;
const htmlEngine_1 = require("./htmlEngine");
class ApiEngine {
    async scan(username, platform, options = {}) {
        const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
        // Construct the unauthenticated API endpoint
        const apiEndpoint = platform.apiEndpoint
            ? platform.apiEndpoint.replace('{}', encodeURIComponent(username))
            : targetUrl;
        const startTime = Date.now();
        const signal = options.signal || null;
        // Timeout controller wrapper for native fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), platform.timeout || 5000);
        if (signal) {
            signal.addEventListener('abort', () => controller.abort());
        }
        try {
            const headers = {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Collector/1.0'
            };
            // reddit demands specific identifiers in UA
            if (platform.name === 'Reddit') {
                headers['User-Agent'] = 'osint-tracker:v1.0.0 (by /u/osint-analyst)';
            }
            // Check for Environment Authorization Token to bypass rate-limiting
            if (platform.envTokenKey && process.env[platform.envTokenKey]) {
                const token = process.env[platform.envTokenKey];
                if (platform.name === 'GitHub') {
                    headers['Authorization'] = `token ${token}`;
                }
                else {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            const response = await fetch(apiEndpoint, {
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const status = response.status;
            // Resilient Fallback to htmlEngine if unauthenticated API gets blocked or rate-limited
            if (status === 429 || status === 403) {
                return htmlEngine_1.htmlEngine.scan(username, platform, options);
            }
            let data = null;
            try {
                data = await response.json();
            }
            catch (e) {
                // Not a JSON response or empty
            }
            const responseTimeMs = Date.now() - startTime;
            // Specific unauthenticated API parsing rules
            if (platform.name === 'GitHub') {
                if (status === 404) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (status === 200 && data && data.login) {
                    return {
                        platform: platform.name,
                        status: 'FOUND',
                        url: targetUrl,
                        responseTimeMs,
                        bio: data.bio || null,
                        avatar: data.avatar_url || null,
                        location: data.location || null
                    };
                }
            }
            if (platform.name === 'Reddit') {
                // Reddit returns { message: 'Not Found', error: 404 } or 404 status
                if (status === 404 || (data && (data.error === 404 || data.message === 'Not Found'))) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (status === 200 && data && data.data && data.kind === 't2') {
                    const redditUser = data.data;
                    return {
                        platform: platform.name,
                        status: 'FOUND',
                        url: targetUrl,
                        responseTimeMs,
                        bio: redditUser.subreddit ? redditUser.subreddit.public_description : null,
                        avatar: redditUser.snoovatar_img || redditUser.icon_img || null,
                        location: null
                    };
                }
            }
            if (platform.name === 'Chess.com') {
                if (status === 404) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (status === 200 && data && data.username) {
                    return {
                        platform: platform.name,
                        status: 'FOUND',
                        url: targetUrl,
                        responseTimeMs,
                        bio: data.title || null,
                        avatar: data.avatar || null,
                        location: data.location || null
                    };
                }
            }
            if (platform.name === 'HackerNews') {
                // HackerNews returns null if user doesn't exist
                if (data === null || data === 'null' || status === 404) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (status === 200 && data && data.id) {
                    return {
                        platform: platform.name,
                        status: 'FOUND',
                        url: targetUrl,
                        responseTimeMs,
                        bio: data.about || null,
                        avatar: null,
                        location: null
                    };
                }
            }
            if (platform.name === 'NPM') {
                if (status === 404) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (status === 200 && data && data.name) {
                    return {
                        platform: platform.name,
                        status: 'FOUND',
                        url: targetUrl,
                        responseTimeMs,
                        bio: data.fullname || null,
                        avatar: null,
                        location: null
                    };
                }
            }
            // Default generic API checks
            if (status === 404) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
            if (status >= 200 && status < 300) {
                return {
                    platform: platform.name,
                    status: 'FOUND',
                    url: targetUrl,
                    responseTimeMs,
                    bio: null,
                    avatar: null,
                    location: null
                };
            }
            // Fallback to HTML Engine for anything else
            return htmlEngine_1.htmlEngine.scan(username, platform, options);
        }
        catch (error) {
            clearTimeout(timeoutId);
            // On network timeout or unhandled exception, fallback to HTML Engine
            return htmlEngine_1.htmlEngine.scan(username, platform, options);
        }
    }
}
exports.ApiEngine = ApiEngine;
exports.apiEngine = new ApiEngine();
