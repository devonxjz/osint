// scratch/test_minimal_fetch.js

async function test() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await fetch('https://devpost.com/__osint_nonexistent_user_998877_xyz__', { headers });
    console.log('Status with UA only:', res.status);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
