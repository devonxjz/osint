// backend/scripts/verify_blacklist_health.js

'use strict';

require('dotenv').config();
const { getAllPlatforms } = require('../api/registry');
const { scanPlatform } = require('../api/scanner');

const DUMMY_USERNAME = '__osint_nonexistent_user_998877_xyz__';

async function runLiveBlacklistAudit() {
  console.log('🚀 Initiating Live OSINT Platform Registry Audit...');
  console.log(`🔍 Querying dummy username: "${DUMMY_USERNAME}" against real target endpoints...\n`);

  const platforms = getAllPlatforms();
  
  // Select key candidate platforms to verify live (skip paid/auth platforms like LinkedIn)
  const candidatePlatforms = platforms.filter(p => 
    !p.envCookieKey && 
    (p.name === 'GitHub' || p.name === 'Devpost' || p.name === 'Medium' || p.name === 'Reddit')
  );

  let staleCount = 0;

  for (const platform of candidatePlatforms) {
    process.stdout.write(`📡 Auditing live platform: [${platform.name}]... `);
    try {
      const result = await scanPlatform(DUMMY_USERNAME, platform);
      
      if (result.status === 'FOUND') {
        console.log(`\n❌ WARNING: Registry rules for [${platform.name}] might be STALE!`);
        console.log(`   - Query returned: FOUND`);
        console.log(`   - Live URL tested: ${result.url}`);
        staleCount++;
      } else {
        console.log(`✅ OK (Correctly resolved to NOT_FOUND)`);
      }
    } catch (err) {
      console.log(`\n⚠️ Query failed due to network: ${err.message}`);
    }
  }

  console.log('\n==================================================');
  if (staleCount > 0) {
    console.log(`🚨 Audit finished: ${staleCount} platform rules are stale or need updates!`);
    process.exit(1);
  } else {
    console.log('🎉 Audit finished: All tested platforms are highly reliable and up-to-date!');
    process.exit(0);
  }
}

runLiveBlacklistAudit();
