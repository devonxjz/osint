// scratch/test_mewe_full.js

async function testMeWeFull(username) {
  const url = `https://mewe.com/i/${username}`;
  console.log(`📡 Fetching MeWe URL (redirect: follow): ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`➡️ Final Status: ${res.status}`);
    console.log(`➡️ Final URL: ${res.url}`);
  } catch (err) {
    console.error(`🚨 Error fetching ${username}:`, err.message);
  }
}

async function run() {
  console.log('--- TESTING MEWE REDIRECT FOLLOW ---\n');
  await testMeWeFull('mewe');
  console.log('\n------------------------------------\n');
  await testMeWeFull('this_non_existent_user_123_xyz');
}

run();
