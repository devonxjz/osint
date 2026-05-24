// scratch/test_cookie_injection_live.js

async function testLiveCookieInjection() {
  console.log('📡 Starting Live Cookie Injection Efficacy Audit...');
  
  const targetUrl = 'https://httpbin.org/headers';
  const cookie = 'session_id_xyz_123456789_active; secure_token=abcdef';

  const headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Collector/1.0',
    'Cookie': cookie
  };

  console.log('🔑 Sent Cookie header to server:', cookie);
  console.log('📡 Fetching from httpbin.org/headers...');

  try {
    const res = await fetch(targetUrl, { headers });
    const data = await res.json();
    console.log('\n📊 Echoed Headers Received from HTTPBin Server:');
    console.log(JSON.stringify(data.headers, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLiveCookieInjection();
