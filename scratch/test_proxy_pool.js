// scratch/test_proxy_pool.js
const { ProxyAgent } = require('undici');

async function testProxy() {
  const proxyUrl = 'http://154.27.196.34:999';
  console.log(`📡 Initiating Connection Audit for Proxy: ${proxyUrl}...`);

  const dispatcher = new ProxyAgent(proxyUrl);
  
  const startTime = Date.now();
  try {
    const res = await fetch('https://httpbin.org/ip', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Collector/1.0'
      },
      dispatcher,
      // 10 second timeout for proxy check
      signal: AbortSignal.timeout(10000)
    });

    const data = await res.json();
    const duration = Date.now() - startTime;
    console.log('\n✅ PROXY CONNECTION SUCCESSFUL!');
    console.log(`⏱️ Latency: ${duration}ms`);
    console.log('📡 Echoed Client IP seen by target server:', data.origin);
    
    if (data.origin.includes('154.27.196.34')) {
      console.log('🎉 CONFIRMED: Request successfully routed and IP is masked by the proxy!');
    } else {
      console.log('⚠️ WARNING: Request succeeded but the IP does not match the proxy IP.');
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.log('\n❌ PROXY CONNECTION FAILED!');
    console.log(`⏱️ Duration tried: ${duration}ms`);
    console.log(`🚨 Error: ${err.message}`);
  }
}

testProxy();
