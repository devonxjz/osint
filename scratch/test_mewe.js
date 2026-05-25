// scratch/test_mewe.js

async function testMeWe(username) {
  const url = `https://mewe.com/i/${username}`;
  console.log(`📡 Fetching MeWe URL: ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'manual' // Do not follow redirects so we see the raw status
    });

    console.log(`➡️ Status: ${res.status}`);
    console.log(`➡️ Headers:`, Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error(`🚨 Error fetching ${username}:`, err.message);
  }
}

async function run() {
  console.log('--- TESTING MEWE CRAWLER FEASIBILITY ---\n');
  await testMeWe('mewe');
  console.log('\n----------------------------------------\n');
  await testMeWe('this_non_existent_user_123_xyz');
}

run();
