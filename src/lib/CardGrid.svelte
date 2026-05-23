<!-- frontend/src/lib/CardGrid.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  // Derived filtered platforms based on reactive selected categories and target identifier compatibility
  let filteredPlatforms = $derived(
    scanner.platforms.filter(p => {
      // 1. Category Filter Check
      const categoryMatch = scanner.categories.includes(p.category);
      if (!categoryMatch) return false;

      // 2. Target Identifier Type Compatibility Check (Task 14)
      if (scanner.targetType) {
        const expectedType = p.identifierType || 'USERNAME';
        return expectedType === scanner.targetType;
      }

      return true;
    })
  );

  // Derived calculations for real-time progress statistics
  let scannedCount = $derived(
    filteredPlatforms.filter(p => !!scanner.results[p.name]).length
  );

  let foundCount = $derived(
    filteredPlatforms.filter(p => scanner.results[p.name]?.status === 'FOUND').length
  );

  // Derived list of platforms with missing required session credentials
  let missingCredentialsPlatforms = $derived(
    scanner.platforms.filter(p => {
      // Must match target type compatibility
      const expectedType = p.identifierType || 'USERNAME';
      if (scanner.targetType && expectedType !== scanner.targetType) return false;

      // Must require cookies and be missing in env
      return p.envCookieKey && !scanner.sessionStatus[p.envCookieKey];
    })
  );

  let showGuide = $state(false);
</script>

<div class="platform-grid-section">
  <!-- Task 14: Dynamic Credentials Warning & Configuration Dashboard -->
  {#if missingCredentialsPlatforms.length > 0}
    <div class="breach-alert-card" style="border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.02); margin-bottom: 8px; padding: 22px; animation: fade-in-up 0.3s ease; display: flex; flex-direction: column; gap: 14px;">
      <div class="breach-card-header" style="color: var(--accent-orange); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(245, 158, 11, 0.15); padding-bottom: 8px;">
        <span style="font-weight: 700; display: flex; align-items: center; gap: 8px;">{scanner.t.restrictedCookies}</span>
        <button 
          type="button" 
          onclick={() => showGuide = !showGuide}
          style="background: transparent; border: 1px solid rgba(245, 158, 11, 0.3); color: var(--accent-orange); font-size: 11px; padding: 4px 10px; border-radius: 20px; cursor: pointer; transition: all 0.2s ease;"
        >
          {showGuide ? scanner.t.hideGuide : scanner.t.showGuide}
        </button>
      </div>

      <!-- Collapsible Extraction Instructions -->
      {#if showGuide}
        <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 14px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; animation: fade-in-up 0.2s ease;">
          <h5 style="margin: 0; color: var(--text-primary); font-weight: 700;">{scanner.t.howToExtractCookies}</h5>
          <ol style="margin: 0; padding-left: 18px; line-height: 1.6; display: flex; flex-direction: column; gap: 4px;">
            <li>{scanner.t.cookieStep1}</li>
            <li>{scanner.t.cookieStep2}</li>
            <li>{scanner.t.cookieStep3}</li>
            <li>{scanner.t.cookieStep4}</li>
            <li>{scanner.t.cookieStep5}</li>
            <li>{scanner.t.cookieStep6}</li>
          </ol>
        </div>
      {/if}

      <!-- Interactive Inputs list -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        {#each missingCredentialsPlatforms as plat}
          <div style="display: grid; grid-template-columns: 140px 1fr 100px; align-items: center; gap: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: var(--text-primary);">{plat.name}</span>
            
            <input 
              type="text" 
              placeholder={scanner.t.pasteCookiePlaceholder}
              value={scanner.cookieOverrides[plat.envCookieKey || ''] || ''}
              style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; font-size: 12px; outline: none; font-family: var(--font-mono);"
              onchange={(e) => {
                const val = (e.target as HTMLInputElement).value.trim();
                scanner.saveCookieOverride(plat.envCookieKey || '', val);
              }}
            />
            
            <div style="display: flex; gap: 6px;">
              {#if scanner.cookieOverrides[plat.envCookieKey || '']}
                <button
                  type="button"
                  style="background: var(--accent-red); color: white; border: none; font-size: 11px; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; width: 100%;"
                  onclick={() => scanner.saveCookieOverride(plat.envCookieKey || '', '')}
                >
                  {scanner.t.clear}
                </button>
              {:else}
                <button
                  type="button"
                  style="background: var(--accent-blue); color: white; border: none; font-size: 11px; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; width: 100%;"
                  onclick={(e) => {
                    const inp = (e.target as HTMLButtonElement).parentElement?.previousElementSibling as HTMLInputElement;
                    scanner.saveCookieOverride(plat.envCookieKey || '', inp?.value?.trim() || '');
                  }}
                >
                  {scanner.t.apply}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="search-card" style="box-shadow: var(--shadow-sm); padding: 20px 24px; gap: 16px; border-color: var(--border-color);">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 class="section-title" style="font-size: 16px;">{scanner.t.dynNetCoverage}</h3>
        <span class="card-category-tag">{scanner.t.checkedOf.replace('{scannedCount}', scannedCount.toString()).replace('{totalCount}', filteredPlatforms.length.toString())}</span>
      </div>

      <!-- Compact Score Badges -->
      <div style="display: flex; gap: 12px; align-items: center;">
        <span class="status-badge" style="background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 6px 12px;">
          {scanner.t.checkedBadge}: {scannedCount}
        </span>
        <span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-size: 12px; font-weight: 700; padding: 6px 12px;">
          {scanner.t.foundBadge}: {foundCount}
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

  <!-- Real-time / Found Results / Empty States Grid Container -->
  {#if filteredPlatforms.length === 0}
    <!-- Empty state when no categories selected -->
    <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
      <span style="font-size: 40px;">⚠️</span>
      <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">{scanner.t.noCatSelected}</h4>
      <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
        {scanner.t.noCatSelectedDesc}
      </p>
    </div>
  {:else if scannedCount === 0 && !scanner.isScanning}
    <!-- Empty State: Before search begins -->
    <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
      <span style="font-size: 40px;">🕵️</span>
      <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">{scanner.t.awaitingInvest}</h4>
      <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
        {scanner.t.awaitingInvestDesc}
      </p>
    </div>
  {:else}
    <!-- Render ONLY the found cards in real-time or when completed -->
    {@const foundScanned = filteredPlatforms.filter(p => scanner.results[p.name]?.status === 'FOUND')}
    
    {#if foundScanned.length === 0}
      {#if scanner.isScanning}
        <!-- Show beautiful real-time scan spinner while scanning with 0 found matches so far -->
        <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm); width: 100%;">
          <div class="pulse-loader" style="width: 32px; height: 32px; border: 3.5px solid var(--border-color); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">{scanner.t.lookupActive}</h4>
          <p style="margin: 0; font-size: 13px; max-width: 400px; line-height: 1.5;">
            {scanner.t.lookupActiveDesc}
          </p>
        </div>
      {:else}
        <!-- No matches found after scan completed -->
        <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-sm); width: 100%;">
          <span style="font-size: 40px;">∅</span>
          <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">{scanner.t.noMatch}</h4>
          <p style="margin: 0; font-size: 14px; max-width: 440px; line-height: 1.5;">
            {scanner.t.noMatchDesc}
          </p>
        </div>
      {/if}
    {:else}
      <!-- Render the discovered matches -->
      <div class="card-grid-container" style="animation: fade-in-up 0.4s ease;">
        {#each foundScanned as platform}
          {@const result = scanner.results[platform.name]}
          <div class="platform-status-card found" style="animation: fade-in-up 0.3s ease; opacity: 1;">
            <div class="card-top-row">
              <h4 class="card-title" style="font-size: 16px;">{platform.name}</h4>
              <span class="status-badge found">{scanner.t.activeMatch}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="card-category-tag" style="font-size: 11px;">
                {platform.category} • {platform.identifierType || 'USERNAME'}
              </span>

              <!-- Dynamic Schema Attribute Badges -->
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                {#if platform.requiresProxy}
                  <span class="status-badge" style="background: rgba(16, 185, 129, 0.08); color: var(--accent-green); font-size: 9px; padding: 2px 5px;">🌐 Proxy</span>
                {/if}
                {#if platform.riskLevel === 'HIGH'}
                  <span class="status-badge" style="background: rgba(239, 68, 68, 0.08); color: var(--accent-red); font-size: 9px; padding: 2px 5px;">⚠️ High Risk</span>
                {/if}
              </div>
            </div>
            
            {#if result?.data?.avatar}
              <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px;">
                <img src={result.data.avatar} style="width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--border-color); object-fit: cover;" alt="{platform.name} avatar" />
                <p class="card-bio" style="margin: 0; -webkit-line-clamp: 1;">{result.data.bio || 'Profile verified'}</p>
              </div>
            {:else if result?.data?.bio}
              <p class="card-bio">{result.data.bio}</p>
            {:else}
              <p class="card-bio" style="font-style: italic; opacity: 0.7;">Footprint verified. Profile active.</p>
            {/if}

            <!-- Clickable External Redirect Link -->
            <a
              href={result?.data?.url}
              target="_blank"
              rel="noreferrer"
              class="dossier-export-btn"
              style="font-size: 12px; padding: 8px 12px; border-radius: 6px; margin-top: auto; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--text-primary); color: var(--bg-card); transition: all 0.2s ease; box-sizing: border-box;"
            >
              {scanner.t.visitProfileBtn}
            </a>
          </div>
        {/each}
      </div>
    {/if}
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
