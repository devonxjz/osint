// scratch/test_tor_connection.js
const { ProxyAgent } = require('undici');

async function testTorPort(port) {
  const torProxy = `socks5://127.0.0.1:${port}`;
  console.log(`📡 Checking Tor SOCKS5 proxy on port ${port}...`);

  const dispatcher = new ProxyAgent(torProxy);
  const startTime = Date.now();
  try {
    const res = await fetch('https://check.torproject.org/api/ip', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0'
      },
      dispatcher,
      signal: AbortSignal.timeout(4000)
    });

    const data = await res.json();
    const duration = Date.now() - startTime;
    console.log(`✅ PORT ${port} SUCCESSFUL! (${duration}ms)`);
    console.log(`   🧅 Tor IP: ${data.IP}`);
    console.log(`   🧅 Tor Status: ${data.IsTor ? 'ONION ROUTING ACTIVE!' : 'Proxy active but not recognized as Tor.'}`);
    return true;
  } catch (err) {
    console.log(`❌ PORT ${port} FAILED (${err.message})`);
    return false;
  }
}

async function run() {
  console.log('📡 Starting Multi-Port Tor Connectivity Audit...\n');
  const success9050 = await testTorPort(9050);
  console.log('');
  const success9150 = await testTorPort(9150);

  console.log('\n📊 Diagnostic Summary:');
  if (success9050) {
    console.log('🎉 Port 9050 (Tor Service) is ACTIVE. You are ready to scan darkweb platforms!');
  } else if (success9150) {
    console.log('🎉 Port 9150 (Tor Browser) is ACTIVE.');
    console.log('💡 Action Required: Please update your .env or .env.local file to set:');
    console.log('   TOR_PROXY_URL=socks5://127.0.0.1:9150');
  } else {
    console.log('🚨 Tor is currently OFFLINE on your machine.');
    console.log('💡 To scan DarkWeb platforms, please open the Tor Browser or start the Tor system daemon.');
  }
}

run();
