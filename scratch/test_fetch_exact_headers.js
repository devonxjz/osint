// scratch/test_fetch_exact_headers.js

async function test() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const res = await fetch('https://devpost.com/__osint_nonexistent_user_998877_xyz__', { headers });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body snippet:', body.substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
