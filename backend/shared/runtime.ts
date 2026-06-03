// backend/shared/runtime.ts
'use strict';

/**
 * Detects whether the code is running in a serverless environment (such as Vercel or AWS Lambda).
 *
 * @returns boolean - true if running in serverless production, false otherwise.
 */
export function isServerless(): boolean {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
}
