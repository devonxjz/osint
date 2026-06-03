// backend/shared/runtime.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.isServerless = isServerless;
/**
 * Detects whether the code is running in a serverless environment (such as Vercel or AWS Lambda).
 *
 * @returns boolean - true if running in serverless production, false otherwise.
 */
function isServerless() {
    return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
}
