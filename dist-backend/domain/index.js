// backend/domain/index.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCloudflareIps = exports.detectWildcardDns = exports.isCloudflareIp = exports.resolveDomainIntel = void 0;
var domain_orchestrator_1 = require("./domain_orchestrator");
Object.defineProperty(exports, "resolveDomainIntel", { enumerable: true, get: function () { return domain_orchestrator_1.resolveDomainIntel; } });
Object.defineProperty(exports, "isCloudflareIp", { enumerable: true, get: function () { return domain_orchestrator_1.isCloudflareIp; } });
Object.defineProperty(exports, "detectWildcardDns", { enumerable: true, get: function () { return domain_orchestrator_1.detectWildcardDns; } });
Object.defineProperty(exports, "syncCloudflareIps", { enumerable: true, get: function () { return domain_orchestrator_1.syncCloudflareIps; } });
