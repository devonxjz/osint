const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Extracts basic metadata (bio, avatar, etc.) if available in HTML
 */
function extractMetadata(html, platformName) {
  const $ = cheerio.load(html);
  let metadata = { bio: null, avatar: null, location: null };

  try {
    if (platformName === 'GitHub') {
      metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
      metadata.bio = $('.p-note div').text().trim() || $('meta[property="og:description"]').attr('content') || null;
      metadata.location = $('span[itemprop="homeLocation"]').text().trim() || null;
    } else if (platformName === 'GitLab') {
      metadata.avatar = $('.avatar-jpg').attr('src') || null;
      metadata.bio = $('.user-profile-bio').text().trim() || null;
    } else if (platformName === 'Medium') {
      metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
      metadata.bio = $('meta[name="description"]').attr('content') || null;
    } else {
      // Generic meta tags extraction as fallback
      metadata.avatar = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
      metadata.bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
    }

    // Clean up urls
    if (metadata.avatar && metadata.avatar.startsWith('//')) {
      metadata.avatar = 'https:' + metadata.avatar;
    }
  } catch (err) {
    // Ignore extraction errors
  }

  return metadata;
}

/**
 * Scans a single username on a single platform
 */
async function scanPlatform(username, platform) {
  const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
  const userAgent = getRandomUserAgent();

  try {
    const response = await axios.get(targetUrl, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 5000,
      validateStatus: () => true // Allow any status code so we can check it
    });

    const status = response.status;
    const html = response.data;

    // 1. Check HTTP status rules
    if (platform.checkType === 'status' && status === platform.checkValue) {
      return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
    }

    // Treat 404 as not found by default
    if (status === 404) {
      return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
    }

    // 2. Check text rules (false positive checking)
    if (platform.checkType === 'text' && typeof html === 'string') {
      if (html.includes(platform.checkValue)) {
        return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
      }
    }

    // 3. Check selector rules (if element absent/present)
    if (platform.checkType === 'selector' && typeof html === 'string') {
      const $ = cheerio.load(html);
      if ($(platform.checkValue).length === 0) {
        return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
      }
    }

    // Standard check if page is actually returning error-like content
    if (status >= 400) {
      return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
    }

    // If passed all rules, user exists!
    const metadata = typeof html === 'string' ? extractMetadata(html, platform.name) : {};
    return {
      platform: platform.name,
      status: 'FOUND',
      url: targetUrl,
      ...metadata
    };

  } catch (error) {
    // If request timeout or network error, count as NOT_FOUND or ERROR depending on context
    // In OSINT, we usually mark connection issues as NOT_FOUND or offline
    return {
      platform: platform.name,
      status: 'NOT_FOUND',
      url: targetUrl,
      error: error.message
    };
  }
}

module.exports = { scanPlatform };
