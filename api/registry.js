// backend/src/registry.js

'use strict';

// Curated Registry of social, tech, gaming, and media platforms with matching rules
const PLATFORMS = [
  // Category: Tech (13 platforms)
  { name: 'GitHub',       category: 'Tech',   url: 'https://github.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'GitLab',       category: 'Tech',   url: 'https://gitlab.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'NPM',          category: 'Tech',   url: 'https://www.npmjs.com/~{}',          checkType: 'status',   checkValue: 404 },
  { name: 'DockerHub',    category: 'Tech',   url: 'https://hub.docker.com/u/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'LeetCode',     category: 'Tech',   url: 'https://leetcode.com/{}',            checkType: 'text',     checkValue: 'user not found' },
  { name: 'CodePen',      category: 'Tech',   url: 'https://codepen.io/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'HackerNews',   category: 'Tech',   url: 'https://news.ycombinator.com/user?id={}', checkType: 'text', checkValue: 'No such user.' },
  { name: 'Replit',       category: 'Tech',   url: 'https://replit.com/@{}',             checkType: 'status',   checkValue: 404 },
  { name: 'Dev.to',       category: 'Tech',   url: 'https://dev.to/{}',                  checkType: 'status',   checkValue: 404 },
  { name: 'Hashnode',     category: 'Tech',   url: 'https://hashnode.com/@{}',           checkType: 'status',   checkValue: 404 },
  { name: 'ProductHunt',  category: 'Tech',   url: 'https://www.producthunt.com/@{}',    checkType: 'status',   checkValue: 404 },
  { name: 'Devpost',      category: 'Tech',   url: 'https://devpost.com/{}',             checkType: 'status',   checkValue: 404 },

  // Category: Social (27 platforms)
  { name: 'Reddit',         category: 'Social', url: 'https://www.reddit.com/user/{}',      checkType: 'text',     checkValue: 'Sorry, nobody on Reddit goes by that name.' },
  { name: 'Medium',         category: 'Social', url: 'https://medium.com/@{}',              checkType: 'status',   checkValue: 404 },
  { name: 'BuyMeACoffee',   category: 'Social', url: 'https://www.buymeacoffee.com/{}',     checkType: 'status',   checkValue: 404 },
  { name: 'Patreon',        category: 'Social', url: 'https://www.patreon.com/{}',          checkType: 'status',   checkValue: 404 },
  { name: 'Pinterest',      category: 'Social', url: 'https://www.pinterest.com/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'Tumblr',         category: 'Social', url: 'https://{}.tumblr.com',               checkType: 'status',   checkValue: 404 },
  { name: 'Flickr',         category: 'Social', url: 'https://www.flickr.com/people/{}',    checkType: 'text',     checkValue: 'Page Not Found' },
  { name: 'Gravatar',       category: 'Social', url: 'https://gravatar.com/{}',             checkType: 'status',   checkValue: 404 },
  { name: 'Threads',        category: 'Social', url: 'https://www.threads.net/@{}',         checkType: 'status',   checkValue: 404 },
  { name: 'X',              category: 'Social', url: 'https://x.com/{}',                    checkType: 'status',   checkValue: 404 },
  { name: 'Bluesky',        category: 'Social', url: 'https://bsky.app/profile/{}.bsky.social', checkType: 'status', checkValue: 404 },
  { name: 'Snapchat',       category: 'Social', url: 'https://www.snapchat.com/add/{}',     checkType: 'status',   checkValue: 404 },
  { name: 'Clubhouse',      category: 'Social', url: 'https://www.clubhouse.com/@{}',       checkType: 'status',   checkValue: 404 },
  { name: 'Quora',          category: 'Social', url: 'https://www.quora.com/profile/{}',    checkType: 'status',   checkValue: 404 },
  { name: 'MeWe',           category: 'Social', url: 'https://mewe.com/i/{}',               checkType: 'status',   checkValue: 404 },
  { name: 'Parler',         category: 'Social', url: 'https://parler.com/profile/{}',       checkType: 'status',   checkValue: 404 },
  { name: 'Gab',            category: 'Social', url: 'https://gab.com/{}',                  checkType: 'status',   checkValue: 404 },
  { name: 'YouTube',        category: 'Social', url: 'https://www.youtube.com/@{}',         checkType: 'status',   checkValue: 404 },
  { name: 'TikTok',         category: 'Social', url: 'https://www.tiktok.com/@{}',          checkType: 'status',   checkValue: 404 },
  { name: 'Kickstarter',    category: 'Social', url: 'https://www.kickstarter.com/profile/{}', checkType: 'status', checkValue: 404 },
  { name: 'Indiegogo',      category: 'Social', url: 'https://www.indiegogo.com/individuals/{}', checkType: 'status', checkValue: 404 },
  // Group B Evasion platforms
  { name: 'Facebook',       category: 'Social', url: 'https://www.facebook.com/{}',         checkType: 'selector', checkValue: 'meta[property="og:title"]', requiresProxy: true, envCookieKey: 'FACEBOOK_COOKIE_KEY', riskLevel: 'HIGH' },
  { name: 'Instagram',      category: 'Social', url: 'https://www.instagram.com/{}/',       checkType: 'text',     checkValue: 'page_not_found', requiresProxy: true, envCookieKey: 'INSTAGRAM_COOKIE_KEY', riskLevel: 'HIGH' },
  { name: 'LinkedIn',       category: 'Social', url: 'https://www.linkedin.com/in/{}',      checkType: 'selector', checkValue: 'code.identity-state', requiresProxy: true, envCookieKey: 'LINKEDIN_COOKIE_KEY', riskLevel: 'HIGH' },

  // Category: Gaming (14 platforms)
  { name: 'Steam',           category: 'Gaming', url: 'https://steamcommunity.com/id/{}',   checkType: 'text',     checkValue: 'The specified profile could not be found.' },
  { name: 'Steam Profiles',  category: 'Gaming', url: 'https://steamcommunity.com/profiles/{}', checkType: 'text',  checkValue: 'The specified profile could not be found.' },
  { name: 'Chess.com',       category: 'Gaming', url: 'https://www.chess.com/member/{}',    checkType: 'status',   checkValue: 404 },
  { name: 'Lichess',         category: 'Gaming', url: 'https://lichess.org/@/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Itch.io',         category: 'Gaming', url: 'https://{}.itch.io',                 checkType: 'status',   checkValue: 404 },
  { name: 'Speedrun.com',    category: 'Gaming', url: 'https://www.speedrun.com/user/{}',   checkType: 'status',   checkValue: 404 },
  { name: 'Twitch',          category: 'Gaming', url: 'https://www.twitch.tv/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Poki',            category: 'Gaming', url: 'https://poki.com/en/g/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'GameFAQs',        category: 'Gaming', url: 'https://gamefaqs.gamespot.com/community/{}', checkType: 'status', checkValue: 404 },
  { name: 'Xbox Gamertag',   category: 'Gaming', url: 'https://xboxgamertag.com/search/{}', checkType: 'text',     checkValue: 'not found' },
  { name: 'Guilded',         category: 'Gaming', url: 'https://www.guilded.gg/{}',          checkType: 'status',   checkValue: 404 },
  { name: 'Roblox',          category: 'Gaming', url: 'https://www.roblox.com/user.aspx?username={}', checkType: 'status', checkValue: 404 },
  { name: 'PSNProfiles',     category: 'Gaming', url: 'https://psnprofiles.com/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'RetroAchievements', category: 'Gaming', url: 'https://retroachievements.org/user/{}', checkType: 'status', checkValue: 404 },

  // Category: Media (17 platforms)
  { name: 'Spotify',        category: 'Media', url: 'https://open.spotify.com/user/{}',    checkType: 'status',   checkValue: 404 },
  { name: 'Instructables',  category: 'Media', url: 'https://www.instructables.com/member/{}/', checkType: 'text', checkValue: 'Not found' },
  { name: 'SoundCloud',     category: 'Media', url: 'https://soundcloud.com/{}',            checkType: 'status',   checkValue: 404 },
  { name: 'Bandcamp',       category: 'Media', url: 'https://{}.bandcamp.com',              checkType: 'status',   checkValue: 404 },
  { name: 'Vimeo',          category: 'Media', url: 'https://vimeo.com/{}',                 checkType: 'status',   checkValue: 404 },
  { name: 'Behance',        category: 'Media', url: 'https://www.behance.net/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Dribbble',       category: 'Media', url: 'https://dribbble.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'Wattpad',        category: 'Media', url: 'https://www.wattpad.com/user/{}',      checkType: 'status',   checkValue: 404 },
  { name: 'ArtStation',     category: 'Media', url: 'https://www.artstation.com/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'Letterboxd',     category: 'Media', url: 'https://letterboxd.com/{}/',           checkType: 'status',   checkValue: 404 },
  { name: 'Goodreads',      category: 'Media', url: 'https://www.goodreads.com/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'DailyMotion',    category: 'Media', url: 'https://www.dailymotion.com/{}',       checkType: 'status',   checkValue: 404 },
  { name: 'Mixcloud',       category: 'Media', url: 'https://www.mixcloud.com/{}/',         checkType: 'status',   checkValue: 404 },
  { name: 'Scribd',         category: 'Media', url: 'https://www.scribd.com/{}',            checkType: 'status',   checkValue: 404 },
  { name: 'Imgur',          category: 'Media', url: 'https://imgur.com/user/{}',            checkType: 'status',   checkValue: 404 },
  { name: 'SlideShare',     category: 'Media', url: 'https://www.slideshare.com/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'Giphy',          category: 'Media', url: 'https://giphy.com/{}',                 checkType: 'status',   checkValue: 404 },

  // Category: Regional (13 platforms)
  { name: 'Weibo',          category: 'Regional', url: 'https://weibo.com/{}',              checkType: 'text',     checkValue: '抱歉，您访问 của trang web có lỗi' },
  { name: 'KakaoTalkStory', category: 'Regional', url: 'https://story.kakao.com/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'Bilibili',       category: 'Regional', url: 'https://space.bilibili.com/{}',     checkType: 'status',   checkValue: 404 },
  { name: 'Xiaohongshu',    category: 'Regional', url: 'https://www.xiaohongshu.com/user/profile/{}', checkType: 'status', checkValue: 404 },
  { name: 'Naver Cafe',     category: 'Regional', url: 'https://cafe.naver.com/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'Baidu Tieba',    category: 'Regional', url: 'https://tieba.baidu.com/home/main?un={}', checkType: 'text', checkValue: '该用户不存在' },
  { name: 'Zhihu',          category: 'Regional', url: 'https://www.zhihu.com/people/{}',   checkType: 'status',   checkValue: 404 },
  { name: 'Kuaishou',       category: 'Regional', url: 'https://www.kuaishou.com/profile/{}', checkType: 'status', checkValue: 404 },
  { name: 'Niconico',       category: 'Regional', url: 'https://www.nicovideo.jp/user/{}',  checkType: 'status',   checkValue: 404 },
  { name: 'AfreecaTV',      category: 'Regional', url: 'https://bj.afreecatv.com/{}',       checkType: 'status',   checkValue: 404 },
  { name: 'LINE',           category: 'Regional', url: 'https://line.me/ti/p/~{}',          checkType: 'status',   checkValue: 404 },
  { name: 'VK',             category: 'Regional', url: 'https://vk.com/{}',                 checkType: 'text',     checkValue: 'profile_deleted' },
  { name: 'Douyin',         category: 'Regional', url: 'https://www.douyin.com/user/{}',    checkType: 'selector', checkValue: '.user-info-container', requiresProxy: true, envCookieKey: 'DOUYIN_COOKIE_KEY', riskLevel: 'HIGH' },

  // Category: Privacy (10 platforms)
  { name: 'Telegram',       category: 'Privacy', url: 'https://t.me/{}',                    checkType: 'text',     checkValue: 'If you have Telegram, you can contact' },
  { name: 'WhatsApp',       category: 'Privacy', url: 'https://api.whatsapp.com/send?phone={}', checkType: 'selector', checkValue: '#action-button', identifierType: 'PHONE' },
  { name: 'Mastodon',       category: 'Privacy', url: 'https://mastodon.social/@{}',        checkType: 'status',   checkValue: 404 },
  { name: 'BeReal',         category: 'Privacy', url: 'https://bereal.app/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'Lemmy',          category: 'Privacy', url: 'https://lemmy.ml/u/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'Misskey',        category: 'Privacy', url: 'https://misskey.io/@{}',             checkType: 'status',   checkValue: 404 },
  { name: 'Pixelfed',       category: 'Privacy', url: 'https://pixelfed.social/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'Diaspora',       category: 'Privacy', url: 'https://diasp.org/people/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'Matrix',         category: 'Privacy', url: 'https://matrix.to/#/@{}:matrix.org',  checkType: 'status',   checkValue: 404 },
  { name: 'Keybase',        category: 'Privacy', url: 'https://keybase.io/{}',               checkType: 'status',   checkValue: 404 },

  // Category: DarkWeb (2 platforms)
  { name: 'Ahmia',          category: 'DarkWeb', url: 'https://ahmia.fi/search/?q={}',      checkType: 'text',     checkValue: 'No results found', timeout: 15000 },
  { name: 'OnionLand',      category: 'DarkWeb', url: 'https://onionlandfires.com/search/?q={}', checkType: 'text', checkValue: 'No results found', timeout: 15000 }
];

/**
 * Maps default schema values for platform lookup configurations.
 * @param {object} p - Raw platform config
 * @returns {object}
 */
function mapPlatformDefaults(p) {
  return {
    identifierType: 'USERNAME',
    requiresProxy: false,
    ...p
  };
}

/**
 * Returns all platforms, optionally filtered by category.
 * @param {string[]} [categories] - e.g. ['Tech', 'Gaming']
 * @returns {object[]}
 */
function getPlatforms(categories = []) {
  if (!categories || categories.length === 0) {
    return getAllPlatforms();
  }
  const lowercasedCats = categories.map(c => c.toLowerCase());
  return PLATFORMS
    .filter(p => lowercasedCats.includes(p.category.toLowerCase()))
    .map(p => mapPlatformDefaults(p));
}

/**
 * Returns the full unfiltered registry.
 * @returns {object[]}
 */
function getAllPlatforms() {
  return PLATFORMS.map(p => mapPlatformDefaults(p));
}

/**
 * Returns all unique category names in the registry.
 * @returns {string[]}
 */
function getCategories() {
  return [...new Set(PLATFORMS.map(p => p.category))];
}

module.exports = {
  getPlatforms,
  getAllPlatforms,
  getCategories,
  platforms: PLATFORMS // Keep legacy export for backwards compatibility
};
