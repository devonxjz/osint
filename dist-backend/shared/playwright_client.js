// backend/shared/playwright_client.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.playwrightStealthClient = exports.PlaywrightStealthClient = void 0;
class PlaywrightStealthClient {
    /**
     * Spawns a high-evasion headless browser context locally to request a target URL.
     *
     * @param url - Target URL
     * @param options - Request options
     */
    async request(url, options = {}) {
        let playwright;
        try {
            playwright = require('playwright');
        }
        catch (e) {
            throw new Error('[PlaywrightStealthClient] Playwright binary or package missing locally.');
        }
        const browser = await playwright.chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        try {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            const context = await browser.newContext({
                userAgent,
                locale: 'en-US',
                viewport: { width: 1280, height: 720 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false
            });
            // Inject standard stealth properties inside context before scan starts (navigator.webdriver = false, WebGL, Canvas)
            const sessionSeed = Math.floor(Math.random() * 256);
            await context.addInitScript((seed) => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                // WebGL spoofing
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function (parameter) {
                    if (parameter === 37445)
                        return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                    if (parameter === 37446)
                        return 'Intel(R) Iris(TM) Plus Graphics 640'; // UNMASKED_RENDERER_WEBGL
                    return getParameter.apply(this, [parameter]);
                };
                // Canvas math noise spoofing
                const getImageData = CanvasRenderingContext2D.prototype.getImageData;
                CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
                    const imageData = getImageData.apply(this, [x, y, w, h]);
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        const offset = (seed + i + Math.floor(Math.random() * 3)) % 3;
                        imageData.data[i] = (imageData.data[i] + offset) % 256;
                    }
                    return imageData;
                };
            }, sessionSeed);
            const page = await context.newPage();
            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            const status = response ? response.status() : 200;
            const headers = response ? response.headers() : {};
            const body = await page.content();
            return {
                status,
                headers: headers,
                body,
                url
            };
        }
        finally {
            await browser.close();
        }
    }
}
exports.PlaywrightStealthClient = PlaywrightStealthClient;
exports.playwrightStealthClient = new PlaywrightStealthClient();
