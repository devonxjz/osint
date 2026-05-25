// backend/username/engines/evasionClient.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvasionClient = void 0;
const undici_1 = require("undici");
const defaultAgent = new undici_1.Agent({
    allowH2: true,
    pipelining: 10
});
class EvasionClient {
    async request(url, options = {}) {
        const { headers = {}, signal, dispatcher } = options;
        // Convert standard headers object to a flat array of alternating header name and value
        // to strictly preserve Chrome-compliant header ordering in undici.
        const flatHeaders = [];
        for (const [key, value] of Object.entries(headers)) {
            flatHeaders.push(key, value);
        }
        const response = await (0, undici_1.request)(url, {
            method: 'GET',
            headers: flatHeaders.length > 0 ? flatHeaders : undefined,
            signal,
            dispatcher: dispatcher || defaultAgent
        });
        const body = await response.body.text();
        return {
            status: response.statusCode,
            headers: response.headers,
            body,
            url
        };
    }
}
exports.EvasionClient = EvasionClient;
