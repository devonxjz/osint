<!-- frontend/src/lib/CardGrid.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  // Curated list of 45 platforms to render reactive cards
  const platforms = [
    { name: 'GitHub', category: 'Tech' },
    { name: 'GitLab', category: 'Tech' },
    { name: 'NPM', category: 'Tech' },
    { name: 'DockerHub', category: 'Tech' },
    { name: 'LeetCode', category: 'Tech' },
    { name: 'CodePen', category: 'Tech' },
    { name: 'HackerNews', category: 'Tech' },
    { name: 'Replit', category: 'Tech' },
    { name: 'Kaggle', category: 'Tech' },
    { name: 'Dev.to', category: 'Tech' },

    { name: 'Reddit', category: 'Social' },
    { name: 'Medium', category: 'Social' },
    { name: 'Linktree', category: 'Social' },
    { name: 'BuyMeACoffee', category: 'Social' },
    { name: 'Patreon', category: 'Social' },
    { name: 'Substack', category: 'Social' },
    { name: 'Pinterest', category: 'Social' },
    { name: 'Tumblr', category: 'Social' },
    { name: 'Flickr', category: 'Social' },
    { name: 'About.me', category: 'Social' },
    { name: 'Gravatar', category: 'Social' },
    { name: 'Keybase', category: 'Social' },
    { name: 'Facebook', category: 'Social' },
    { name: 'Gmail', category: 'Social' },
    { name: 'Instagram', category: 'Social' },
    { name: 'Threads', category: 'Social' },
    { name: 'X', category: 'Social' },

    { name: 'Steam', category: 'Gaming' },
    { name: 'Chess.com', category: 'Gaming' },
    { name: 'Lichess', category: 'Gaming' },
    { name: 'Itch.io', category: 'Gaming' },
    { name: 'Speedrun.com', category: 'Gaming' },
    { name: 'Twitch', category: 'Gaming' },
    { name: 'Poki', category: 'Gaming' },
    { name: 'GameFAQs', category: 'Gaming' },
    { name: 'Xbox Gamertag', category: 'Gaming' },

    { name: 'Spotify', category: 'Media' },
    { name: 'Instructables', category: 'Media' },
    { name: 'SoundCloud', category: 'Media' },
    { name: 'Bandcamp', category: 'Media' },
    { name: 'Vimeo', category: 'Media' },
    { name: 'Behance', category: 'Media' },
    { name: 'Dribbble', category: 'Media' },
    { name: 'Wattpad', category: 'Media' },
    { name: 'ArtStation', category: 'Media' }
  ];

  // Derived filtered platforms to display
  let filteredPlatforms = $derived(
    platforms.filter(p => scanner.categories.includes(p.category))
  );

  // Derived summary calculations
  let scannedCount = $derived(
    filteredPlatforms.filter(p => !!scanner.results[p.name]).length
  );

  let foundCount = $derived(
    filteredPlatforms.filter(p => scanner.results[p.name]?.status === 'FOUND').length
  );

  let foundPlatforms = $derived(
    filteredPlatforms
      .filter(p => scanner.results[p.name]?.status === 'FOUND')
      .map(p => ({
        name: p.name,
        category: p.category,
        url: scanner.results[p.name]?.data?.url || '',
        bio: scanner.results[p.name]?.data?.bio || '',
        avatar: scanner.results[p.name]?.data?.avatar || null,
        location: scanner.results[p.name]?.data?.location || null
      }))
  );
</script>

<div class="platform-grid-section">
  <!-- HUD Stats Header Panel -->
  <div class="search-card" style="box-shadow: var(--shadow-sm); padding: 20px 24px; gap: 16px; border-color: var(--border-color);">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 class="section-title" style="font-size: 16px;">🔍 Target Network Coverage</h3>
        <span class="card-category-tag">Checked {scannedCount} of {filteredPlatforms.length} platform endpoints</span>
      </div>

      <!-- Compact Score Badges -->
      <div style="display: flex; gap: 12px; align-items: center;">
        <span class="status-badge" style="background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 6px 12px;">
          Checked: {scannedCount}
        </span>
        <span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-size: 12px; font-weight: 700; padding: 6px 12px;">
          Found: {foundCount}
        </span>
      </div>
    </div>

    <!-- Active Search Progress Bar -->
    {#if scanner.isScanning}
      <div class="progress-bar-bg" style="height: 6px;">
        <div class="progress-bar-fill" style="width: {filteredPlatforms.length > 0 ? (scannedCount / filteredPlatforms.length) * 100 : 0}%;"></div>
      </div>
    {/if}
  </div>

  <!-- Found Results / Empty States Grid Container -->
  {#if scannedCount === 0 && !scanner.isScanning}
    <!-- Empty State: Before search begins -->
    <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
      <span style="font-size: 40px;">🕵️</span>
      <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">Awaiting Target Investigation</h4>
      <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
        Enter a target username or email address above, select your investigation types, and click <strong>Scan</strong> to trace digital footprints.
      </p>
    </div>
  {:else if foundCount === 0}
    <!-- No matches yet (either scanning or nothing found) -->
    <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
      {#if scanner.isScanning}
        <span style="font-size: 40px; display: inline-block; animation: pulse-glow 1.5s infinite;">🔎</span>
        <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">Scanning Network Endpoints...</h4>
        <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
          Checking platform databases in parallel batches of 15. Verified matching profiles will resolve here in real-time.
        </p>
      {:else}
        <span style="font-size: 40px;">∅</span>
        <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">No Matches Identified</h4>
        <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
          The investigation was completed, but no public digital footprints matching this target were detected on the searched networks.
        </p>
      {/if}
    </div>
  {:else}
    <!-- Render ONLY the found cards! -->
    <div class="card-grid-container" style="animation: fade-in-up 0.4s ease;">
      {#each foundPlatforms as found}
        <div class="platform-status-card found" style="animation: fade-in-up 0.3s ease; opacity: 1;">
          <div class="card-top-row">
            <h4 class="card-title" style="font-size: 17px;">{found.name}</h4>
            <span class="status-badge found">Active Match</span>
          </div>
          
          <span class="card-category-tag" style="font-size: 11px;">
            {found.category} {#if found.location} • {found.location} {/if}
          </span>
          
          <!-- Avatar Preview (if plucked from target profile) -->
          {#if found.avatar}
            <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px;">
              <img src={found.avatar} style="width: 42px; height: 42px; border-radius: 50%; border: 1.5px solid var(--border-color); object-fit: cover;" alt="{found.name} Profile avatar" />
              <div style="display: flex; flex-direction: column; overflow: hidden;">
                <p class="card-bio" style="margin: 0; line-clamp: 1;">{found.bio || 'Profile authenticated'}</p>
              </div>
            </div>
          {:else}
            {#if found.bio}
              <p class="card-bio">{found.bio}</p>
            {:else}
              <p class="card-bio" style="font-style: italic; opacity: 0.7;">Footprint verified. Profile active.</p>
            {/if}
          {/if}

          <!-- Clickable External Redirect Link -->
          <a
            href={found.url}
            target="_blank"
            rel="noreferrer"
            class="dossier-export-btn"
            style="font-size: 12px; padding: 8px 12px; border-radius: 6px; margin-top: auto; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--text-primary); color: var(--bg-card); transition: all 0.2s ease;"
          >
            Visit Profile ↗
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
