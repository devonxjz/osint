// backend/username/engines/evasionClient.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.evasionClient = exports.EvasionClient = void 0;
const undici_1 = require("undici");
// Chrome-like TLS ciphers for JA3/JA4 fingerprinting
const chromeCiphers = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
].join(':');
const defaultAgent = new undici_1.Agent({
    allowH2: true,
    pipelining: 10,
    connect: {
        ciphers: chromeCiphers,
        minVersion: 'TLSv1.2'
    }
});
class EvasionClient {
    async request(url, options = {}) {
        const { method = 'GET', headers = {}, signal, dispatcher, body: reqBody, responseType = 'text' } = options;
        // Convert standard headers object to a flat array of alternating header name and value
        // to strictly preserve Chrome-compliant header ordering in undici.
        const flatHeaders = [];
        for (const [key, value] of Object.entries(headers)) {
            flatHeaders.push(key, value);
        }
        const response = await (0, undici_1.request)(url, {
            method: method,
            headers: flatHeaders.length > 0 ? flatHeaders : undefined,
            body: reqBody,
            signal,
            dispatcher: dispatcher || defaultAgent
        });
        let body;
        if (responseType === 'buffer') {
            const arrayBuf = await response.body.arrayBuffer();
            body = Buffer.from(arrayBuf);
        }
        else {
            body = await response.body.text();
        }
        return {
            status: response.statusCode,
            headers: response.headers,
            body,
            url
        };
    }
}
exports.EvasionClient = EvasionClient;
exports.evasionClient = new EvasionClient();
