// api/index.js
'use strict';

const app = require('../dist-backend/index').default;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[OSINT Backend] Server listening on port ${PORT}`);
  });
}

module.exports = app;
