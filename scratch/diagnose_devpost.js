// scratch/diagnose_devpost.js
const axios = require('axios');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 30 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });

async function diagnose() {
  const headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5,zh-CN;q=0.3',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Referer': 'https://www.google.com/'
  };

  const response = await axios.get('https://devpost.com/__osint_nonexistent_user_998877_xyz__', {
    headers,
    timeout: 5000,
    validateStatus: () => true,
    httpAgent,
    httpsAgent
  });

  console.log('Status:', response.status);
  console.log('Redirects / Request URL:', response.request.res.responseUrl);
  console.log('Body snippet:', String(response.data).substring(0, 500));
}

diagnose().catch(console.error);
