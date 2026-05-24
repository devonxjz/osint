// scratch/test_scan_platform.js
const { getAllPlatforms } = require('../dist-backend/username');
const { scanPlatform } = require('../dist-backend/username/scanner');

async function test() {
  const platforms = getAllPlatforms();
  const devpost = platforms.find(p => p.name === 'Devpost');
  console.log('Devpost Platform config:', devpost);
  const result = await scanPlatform('__osint_nonexistent_user_998877_xyz__', devpost);
  console.log('ScanResult:', result);
}

test();
