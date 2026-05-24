// c:\Users\ADMIN\Documents\MyProject\osint\.gemini\antigravity\brain\e7ddc153-76df-4493-a0f5-956b6106dc3a/scratch/test_devpost.js

const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://devpost.com/__osint_nonexistent_user_998877_xyz__', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: () => true
    });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    console.log('Data Snippet:', String(res.data).substring(0, 1000));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
