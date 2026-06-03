// backend/shared/proxy_client.ts
'use strict';

import { evasionClient, EvasionResponse, EvasionRequestOptions } from '../username/engines/evasionClient';

export class ProxyClient {
  private getApiKey(): string {
    return process.env.ZENROWS_API_KEY || '';
  }

  /**
   * Routes a request via the ZenRows API proxy to bypass WAF challenges.
   *
   * @param url - Target URL
   * @param options - Request options
   */
  async request(url: string, options: EvasionRequestOptions = {}): Promise<EvasionResponse> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      console.warn('[ProxyClient] ZENROWS_API_KEY is not defined. Falling back directly to evasionClient.');
      return evasionClient.request(url, options);
    }

    // Construct ZenRows proxy URL
    // Standard ZenRows GET proxy pattern
    const proxyUrl = `https://api.zenrows.com/v1/?apikey=${apiKey}&url=${encodeURIComponent(url)}&js_render=true`;

    // Forward request options to proxy
    // ZenRows will proxy the HTTP request to the target URL
    return evasionClient.request(proxyUrl, {
      ...options,
      // Overwrite dispatcher to use default agent connect configuration
      dispatcher: undefined
    });
  }
}

export const proxyClient = new ProxyClient();
