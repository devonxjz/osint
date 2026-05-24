// backend/username/scanner.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPlatform = scanPlatform;
const apiEngine_1 = require("./engines/apiEngine");
const htmlEngine_1 = require("./engines/htmlEngine");
const browserEngine_1 = require("./engines/browserEngine");
/**
 * Polymorphic Scan Platform Router
 * Delegates the scan target query to the appropriate specialized engine.
 */
async function scanPlatform(username, platform, cookieOverrides = {}, signal = null) {
    let engine;
    if (platform.checkType === 'api') {
        engine = apiEngine_1.apiEngine;
    }
    else if (platform.checkType === 'browser') {
        engine = browserEngine_1.browserEngine;
    }
    else {
        engine = htmlEngine_1.htmlEngine; // status, text, selector
    }
    return engine.scan(username, platform, { cookieOverrides, signal });
}
