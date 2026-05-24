// api/index.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../dist-backend/index').default;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[OSINT Backend] Server listening on port ${PORT}`);
  });
}

module.exports = app;
