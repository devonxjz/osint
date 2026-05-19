// backend/src/registry.js

'use strict';

// Curated Registry of social, tech, gaming, and media platforms with matching rules
const PLATFORMS = [
  // Category: Tech (10 platforms)
  { name: 'GitHub',       category: 'Tech',   url: 'https://github.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'GitLab',       category: 'Tech',   url: 'https://gitlab.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'NPM',          category: 'Tech',   url: 'https://www.npmjs.com/~{}',          checkType: 'status',   checkValue: 404 },
  { name: 'DockerHub',    category: 'Tech',   url: 'https://hub.docker.com/u/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'LeetCode',     category: 'Tech',   url: 'https://leetcode.com/{}',            checkType: 'text',     checkValue: 'user not found' },
  { name: 'CodePen',      category: 'Tech',   url: 'https://codepen.io/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'HackerNews',   category: 'Tech',   url: 'https://news.ycombinator.com/user?id={}', checkType: 'text', checkValue: 'No such user.' },
  { name: 'Replit',       category: 'Tech',   url: 'https://replit.com/@{}',             checkType: 'status',   checkValue: 404 },
  { name: 'Kaggle',       category: 'Tech',   url: 'https://www.kaggle.com/{}',          checkType: 'status',   checkValue: 404 },
  { name: 'Dev.to',       category: 'Tech',   url: 'https://dev.to/{}',                  checkType: 'status',   checkValue: 404 },

  // Category: Social (17 platforms)
  { name: 'Reddit',         category: 'Social', url: 'https://www.reddit.com/user/{}',      checkType: 'text',     checkValue: 'Sorry, nobody on Reddit goes by that name.' },
  { name: 'Medium',         category: 'Social', url: 'https://medium.com/@{}',              checkType: 'status',   checkValue: 404 },
  { name: 'Linktree',       category: 'Social', url: 'https://linktr.ee/{}',                checkType: 'status',   checkValue: 404 },
  { name: 'BuyMeACoffee',   category: 'Social', url: 'https://www.buymeacoffee.com/{}',     checkType: 'status',   checkValue: 404 },
  { name: 'Patreon',        category: 'Social', url: 'https://www.patreon.com/{}',          checkType: 'status',   checkValue: 404 },
  { name: 'Substack',       category: 'Social', url: 'https://{}.substack.com',             checkType: 'status',   checkValue: 404 },
  { name: 'Pinterest',      category: 'Social', url: 'https://www.pinterest.com/{}',        checkType: 'status',   checkValue: 404 },
  { name: 'Tumblr',         category: 'Social', url: 'https://{}.tumblr.com',               checkType: 'status',   checkValue: 404 },
  { name: 'Flickr',         category: 'Social', url: 'https://www.flickr.com/people/{}',    checkType: 'text',     checkValue: 'Page Not Found' },
  { name: 'About.me',       category: 'Social', url: 'https://about.me/{}',                 checkType: 'status',   checkValue: 404 },
  { name: 'Gravatar',       category: 'Social', url: 'https://gravatar.com/{}',             checkType: 'status',   checkValue: 404 },
  { name: 'Keybase',        category: 'Social', url: 'https://keybase.io/{}',               checkType: 'status',   checkValue: 404 },
  { name: 'Facebook',       category: 'Social', url: 'https://www.facebook.com/{}',         checkType: 'status',   checkValue: 404 },
  { name: 'Gmail',          category: 'Social', url: 'https://mail.google.com/mail/u/0/?view=cm&fs=1&to={}', checkType: 'status', checkValue: 404 },
  { name: 'Instagram',      category: 'Social', url: 'https://www.instagram.com/{}/',       checkType: 'status',   checkValue: 404 },
  { name: 'Threads',        category: 'Social', url: 'https://www.threads.net/@{}',         checkType: 'status',   checkValue: 404 },
  { name: 'X',              category: 'Social', url: 'https://x.com/{}',                    checkType: 'status',   checkValue: 404 },

  // Category: Gaming (9 platforms)
  { name: 'Steam',           category: 'Gaming', url: 'https://steamcommunity.com/id/{}',   checkType: 'text',     checkValue: 'The specified profile could not be found.' },
  { name: 'Chess.com',       category: 'Gaming', url: 'https://www.chess.com/member/{}',    checkType: 'status',   checkValue: 404 },
  { name: 'Lichess',         category: 'Gaming', url: 'https://lichess.org/@/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Itch.io',         category: 'Gaming', url: 'https://{}.itch.io',                 checkType: 'status',   checkValue: 404 },
  { name: 'Speedrun.com',    category: 'Gaming', url: 'https://www.speedrun.com/user/{}',   checkType: 'status',   checkValue: 404 },
  { name: 'Twitch',          category: 'Gaming', url: 'https://www.twitch.tv/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Poki',            category: 'Gaming', url: 'https://poki.com/en/g/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'GameFAQs',        category: 'Gaming', url: 'https://gamefaqs.gamespot.com/community/{}', checkType: 'status', checkValue: 404 },
  { name: 'Xbox Gamertag',   category: 'Gaming', url: 'https://xboxgamertag.com/search/{}', checkType: 'text',     checkValue: 'not found' },

  // Category: Media (9 platforms)
  { name: 'Spotify',        category: 'Media', url: 'https://open.spotify.com/user/{}',    checkType: 'status',   checkValue: 404 },
  { name: 'Instructables',  category: 'Media', url: 'https://www.instructables.com/member/{}/', checkType: 'text', checkValue: 'Not found' },
  { name: 'SoundCloud',     category: 'Media', url: 'https://soundcloud.com/{}',            checkType: 'status',   checkValue: 404 },
  { name: 'Bandcamp',       category: 'Media', url: 'https://{}.bandcamp.com',              checkType: 'status',   checkValue: 404 },
  { name: 'Vimeo',          category: 'Media', url: 'https://vimeo.com/{}',                 checkType: 'status',   checkValue: 404 },
  { name: 'Behance',        category: 'Media', url: 'https://www.behance.net/{}',           checkType: 'status',   checkValue: 404 },
  { name: 'Dribbble',       category: 'Media', url: 'https://dribbble.com/{}',              checkType: 'status',   checkValue: 404 },
  { name: 'Wattpad',        category: 'Media', url: 'https://www.wattpad.com/user/{}',      checkType: 'status',   checkValue: 404 },
  { name: 'ArtStation',     category: 'Media', url: 'https://www.artstation.com/{}',        checkType: 'status',   checkValue: 404 },
];

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
  return PLATFORMS.filter(p => lowercasedCats.includes(p.category.toLowerCase()));
}

/**
 * Returns the full unfiltered registry.
 * @returns {object[]}
 */
function getAllPlatforms() {
  return PLATFORMS.map(p => ({ ...p }));
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
