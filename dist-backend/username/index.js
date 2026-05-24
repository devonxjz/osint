// backend/username/index.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPlatform = exports.getCategories = exports.getPlatforms = exports.getAllPlatforms = exports.orchestrateScan = void 0;
var orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "orchestrateScan", { enumerable: true, get: function () { return orchestrator_1.orchestrateScan; } });
var registry_1 = require("./registry");
Object.defineProperty(exports, "getAllPlatforms", { enumerable: true, get: function () { return registry_1.getAllPlatforms; } });
Object.defineProperty(exports, "getPlatforms", { enumerable: true, get: function () { return registry_1.getPlatforms; } });
Object.defineProperty(exports, "getCategories", { enumerable: true, get: function () { return registry_1.getCategories; } });
var scanner_1 = require("./scanner");
Object.defineProperty(exports, "scanPlatform", { enumerable: true, get: function () { return scanner_1.scanPlatform; } });
