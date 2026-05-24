// scratch/test_fetch.js

async function test() {
  try {
    const res = await fetch('https://devpost.com/__osint_nonexistent_user_998877_xyz__', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    console.log('Url:', res.url);
    const body = await res.text();
    console.log('Body snippet:', body.substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
