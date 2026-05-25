// scratch/test_mewe_engine.js
const { HtmlEngine } = require('../dist-backend/username/engines/htmlEngine');
const { getPlatforms } = require('../dist-backend/username/registry');

async function run() {
  const engine = new HtmlEngine();
  const platforms = getPlatforms();
  const meweConfig = platforms.find(p => p.name === 'MeWe');

  if (!meweConfig) {
    console.error('❌ MeWe platform config not found in registry!');
    return;
  }

  console.log('--- TESTING MEWE SCAN VIA HTMLENGINE ---\n');

  console.log('🔍 Scanning for existent username "mewe"...');
  const resExistent = await engine.scan('mewe', meweConfig);
  console.log('Result (Existent):', resExistent);

  console.log('\n----------------------------------------\n');

  console.log('🔍 Scanning for non-existent username "this_non_existent_user_123_xyz"...');
  const resNonExistent = await engine.scan('this_non_existent_user_123_xyz', meweConfig);
  console.log('Result (Non-Existent):', resNonExistent);
}

run().catch(console.error);
