// backend/email/index.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDossierPDF = exports.orchestrateEmailScan = void 0;
var email_orchestrator_1 = require("./email_orchestrator");
Object.defineProperty(exports, "orchestrateEmailScan", { enumerable: true, get: function () { return email_orchestrator_1.orchestrateEmailScan; } });
var pdf_generator_1 = require("./pdf_generator");
Object.defineProperty(exports, "generateDossierPDF", { enumerable: true, get: function () { return pdf_generator_1.generateDossierPDF; } });
