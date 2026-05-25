// backend/username/engines/evasionClient.ts
'use strict';

import { request, Agent } from 'undici';

export interface EvasionRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  proxyUrl?: string;
  dispatcher?: any;
}

export interface EvasionResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  url?: string;
}

const defaultAgent = new Agent({
  allowH2: true,
  pipelining: 10
});

export class EvasionClient {
  async request(url: string, options: EvasionRequestOptions = {}): Promise<EvasionResponse> {
    const { headers = {}, signal, dispatcher } = options;

    // Convert standard headers object to a flat array of alternating header name and value
    // to strictly preserve Chrome-compliant header ordering in undici.
    const flatHeaders: string[] = [];
    for (const [key, value] of Object.entries(headers)) {
      flatHeaders.push(key, value);
    }

    const response = await request(url, {
      method: 'GET',
      headers: flatHeaders.length > 0 ? flatHeaders : undefined,
      signal,
      dispatcher: dispatcher || defaultAgent
    });

    const body = await response.body.text();

    return {
      status: response.statusCode,
      headers: response.headers as Record<string, string | string[] | undefined>,
      body,
      url
    };
  }
}

