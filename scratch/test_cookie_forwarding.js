// scratch/test_cookie_forwarding.js
const { orchestrateScan } = require('../dist-backend/username/orchestrator');
const { getPlatforms } = require('../dist-backend/username/registry');

async function run() {
  const allPlatforms = getPlatforms();
  const targetPlatforms = allPlatforms.filter(p => p.name === 'Facebook');

  if (targetPlatforms.length === 0) {
    console.error('❌ Facebook platform not found!');
    return;
  }

  console.log('--- TESTING COOKIE OVERRIDES FORWARDING ---\n');

  const cookies = {
    'FACEBOOK_COOKIE_KEY': 'test_cookie_value_from_frontend_12345'
  };

  const results = [];
  await orchestrateScan(
    'test_user',
    targetPlatforms,
    {
      onResult: (res) => {
        results.push(res);
      },
      onProgress: (p) => {},
      onError: (name, err) => {
        console.error(`Error on ${name}: ${err}`);
      }
    },
    {
      cookies,
      maxConcurrency: 1
    }
  );

  console.log('Scan results obtained:', results);
}

run().catch(console.error);
