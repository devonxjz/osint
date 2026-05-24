// backend/realname/index.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreConfidence = exports.generateVariants = exports.scanIdentity = void 0;
var realname_orchestrator_1 = require("./realname_orchestrator");
Object.defineProperty(exports, "scanIdentity", { enumerable: true, get: function () { return realname_orchestrator_1.scanIdentity; } });
Object.defineProperty(exports, "generateVariants", { enumerable: true, get: function () { return realname_orchestrator_1.generateVariants; } });
Object.defineProperty(exports, "scoreConfidence", { enumerable: true, get: function () { return realname_orchestrator_1.scoreConfidence; } });
