// scratch/debug_devpost.js
const { htmlEngine } = require('../dist-backend/username/engines/htmlEngine');
const { getAllPlatforms } = require('../dist-backend/username');

async function test() {
  const platforms = getAllPlatforms();
  const devpost = platforms.find(p => p.name === 'Devpost');
  
  const result = await htmlEngine.scan('__osint_nonexistent_user_998877_xyz__', devpost);
  console.log('Result:', result);
}

test();
