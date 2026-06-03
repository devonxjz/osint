// backend/shared/blacklist.ts

'use strict';

export const GLOBAL_HTML_BLACKLIST = [
  'page not found',
  'profile not found',
  'user not found',
  'cannot be found',
  'could not be found',
  "we can't find that page",
  "page no longer exists",
  'no such user',
  'user does not exist',
  "user doesn't exist",
  'account does not exist',
  "account doesn't exist",
  'profile does not exist',
  "profile doesn't exist",
  'we have shut down stack overflow jobs',
  'story has been shut down',
  'story has been sunset',
  'không phải cứ biến mất là mất tích',
  'trang này thì mất tích thật rồi',
  'liên kết không hoạt động hoặc trang này không còn nữa',
  'sorry, that page does not exist',
  "page you're looking for could not be found",
  'there was an error on the server',
  'the server returned this error',
  'error! there was an error on the server',
  
  // Custom platform soft 404 indicators
  'rất tiếc! không tìm thấy nội dung này',
  'this member isn’t supporting any creators at the moment'
];

/**
 * Checks if the fetched HTML represents a soft 404 not found page.
 * Implements an exclusion guard to prevent false-negatives when the username or bio
 * contains the blacklist phrase.
 */
export function isSoft404(
  html: string,
  username: string,
  bio: string | null | undefined
): boolean {
  if (typeof html !== 'string') {
    return false;
  }

  const lowerHtml = html.toLowerCase();
  const lowerUsername = (username || '').toLowerCase();
  const lowerBio = (bio || '').toLowerCase();

  for (const phrase of GLOBAL_HTML_BLACKLIST) {
    if (lowerHtml.includes(phrase)) {
      // If the phrase is part of the username or bio, ignore this matching phrase
      if (lowerUsername.includes(phrase) || lowerBio.includes(phrase)) {
        continue;
      }
      return true;
    }
  }

  return false;
}
