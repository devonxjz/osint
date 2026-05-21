<!-- frontend/src/lib/EmailDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let dossier = $derived(scanner.emailDossier);
  let identity = $derived(scanner.identityResult);
  let breaches = $derived(scanner.breaches);
  let permutations = $derived(scanner.emailPermutations);
  let hasGravatar = $derived(scanner.hasGravatar);
  let avatarUrl = $derived(scanner.avatarUrl);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="email-dossier-wrapper">
  {#if scanner.target.trim()}
    <!-- SECTION 1: Target Identity & Permutations Gate -->
    <div class="glass-panel main-header-panel">
      <div class="status-indicator">
        <span class="pulse-dot" class:active={scanner.isScanning}></span>
        <span class="status-text">{scanner.isScanning ? 'Intel Gathering...' : 'Intel Complete'}</span>
      </div>
      <h2 class="target-title-display">
        📧 {scanner.target.trim()}
      </h2>
      <div class="metadata-grid">
        <div class="meta-item">
          <span class="meta-label">Domain Registry</span>
          <span class="meta-value domain-pill">{scanner.target.split('@')[1] || 'Analyzing...'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Gravatar Sync</span>
          <span class="meta-value" style="color: {hasGravatar ? 'var(--accent-green)' : 'var(--text-secondary)'}">
            {hasGravatar ? '✓ Profile Synced' : 'No Profile Match'}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Database Compromises</span>
          <span class="meta-value" style="color: {breaches.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
            {breaches.length > 0 ? `⚠️ ${breaches.length} Breach(es)` : '✓ Clean Status'}
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Identity Resolution & Employer Details -->
    {#if identity && (identity.realName || scanner.isScanning)}
      <div class="glass-panel identity-resolution-panel transition-fade">
        <h3 class="panel-section-title">👤 Reverse Identity Resolution</h3>
        {#if identity.realName}
          <div class="identity-info-grid">
            <div class="identity-card-badge">
              {#if avatarUrl}
                <img src={avatarUrl} alt={identity.realName} class="gravatar-avatar-large" />
              {:else}
                <div class="avatar-stub">{identity.realName.slice(0, 2).toUpperCase()}</div>
              {/if}
              <div class="badge-text-group">
                <span class="id-name">{identity.realName}</span>
                {#if identity.employer || identity.position}
                  <span class="id-loc">💼 {identity.position || 'Employee'} at {identity.employer || 'Unknown Employer'}</span>
                {:else}
                  <span class="id-loc">📍 Public Footprint Match</span>
                {/if}
              </div>
            </div>
            <div class="details-list">
              <div class="detail-row">
                <span class="row-lbl">Confidence Level:</span>
                <span class="row-val" style="color: {identity.confidence === 'HIGH' ? 'var(--accent-green)' : 'var(--accent-blue)'}; font-weight: 700;">
                  {identity.confidence || 'LOW'}
                </span>
              </div>
              <div class="detail-row">
                <span class="row-lbl">Intel Sources:</span>
                <span class="row-val font-mono">{(identity.sources || ['Gravatar Sync', 'Public Leaks']).join(', ')}</span>
              </div>
            </div>
          </div>
        {:else if scanner.isScanning}
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <span>Interrogating Identity Directories...</span>
          </div>
        {:else}
          <span class="no-results-msg">No structured identity footprints resolved for this target.</span>
        {/if}
      </div>
    {/if}

    <!-- SECTION 3: Deep Permutation Variants (Interactive) -->
    {#if permutations && (permutations.workEmails.length > 0 || permutations.personalEmails.length > 0)}
      <div class="glass-panel permutation-panel transition-fade">
        <h3 class="panel-section-title">🔄 Multi-Platform Identity Permutations</h3>
        <p class="panel-section-subtitle">
          Derived email combinations based on name structure and workspace registry, ideal for physical correlation analysis. Click any variant to copy to clipboard.
        </p>

        {#if permutations.workEmails.length > 0}
          <div class="permutation-group">
            <span class="permutation-group-title">Corporate & Workspace Targets</span>
            <div class="variant-chips-container">
              {#each permutations.workEmails as email}
                <button
                  type="button"
                  class="variant-chip work"
                  onclick={() => copyToClipboard(email)}
                  title="Click to copy corporate variant"
                >
                  <span class="variant-tag">WORK</span>
                  <span class="variant-email">{email}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if permutations.personalEmails.length > 0}
          <div class="permutation-group" style="margin-top: 16px;">
            <span class="permutation-group-title">Personal Web Targets</span>
            <div class="variant-chips-container">
              {#each permutations.personalEmails as email}
                <button
                  type="button"
                  class="variant-chip personal"
                  onclick={() => copyToClipboard(email)}
                  title="Click to copy personal variant"
                >
                  <span class="variant-tag">PERS</span>
                  <span class="variant-email">{email}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* --- Premium HSL Glassmorphism Stylings --- */
  .email-dossier-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
  }

  .glass-panel {
    background: var(--bg-card);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease, border-color 0.3s ease;
  }

  .glass-panel:hover {
    border-color: var(--accent-blue);
  }

  .main-header-panel {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
    position: relative;
    overflow: hidden;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    top: 24px;
    right: 24px;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--accent-green);
  }

  .pulse-dot.active {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.9);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }
    100% {
      transform: scale(0.9);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  .status-text {
    font-size: 11px;
    text-transform: uppercase;
    font-family: var(--font-mono);
    color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  .target-title-display {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 20px 0;
    font-feature-settings: "tnum";
    letter-spacing: -0.02em;
    word-break: break-all;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-label {
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .meta-value {
    font-size: 15px;
    color: var(--text-primary);
    font-weight: 700;
  }

  .domain-pill {
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .panel-section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 16px 0;
    letter-spacing: -0.01em;
  }

  .panel-section-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin: -8px 0 20px 0;
    line-height: 1.5;
  }

  /* --- Identity Panel Styles --- */
  .identity-info-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .identity-card-badge {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .gravatar-avatar-large {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    object-fit: cover;
  }

  .avatar-stub {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .badge-text-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .id-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .id-loc {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .details-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .row-lbl {
    color: var(--text-secondary);
  }

  .row-val {
    font-weight: 600;
    color: var(--text-primary);
  }

  /* --- Permutations Styling --- */
  .permutation-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .permutation-group-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .variant-chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .variant-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .variant-chip:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--accent-blue);
    transform: translateY(-1px);
  }

  .variant-chip:active {
    transform: translateY(0);
  }

  .variant-tag {
    font-size: 9px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 4px;
  }

  .variant-chip.work .variant-tag {
    background: rgba(99, 102, 241, 0.15);
    color: var(--accent-blue);
  }

  .variant-chip.personal .variant-tag {
    background: rgba(148, 163, 184, 0.15);
    color: var(--text-secondary);
  }

  .variant-email {
    font-family: var(--font-mono);
  }

  /* --- Global Placeholders & Utilities --- */
  .no-results-msg {
    font-size: 13px;
    color: var(--text-secondary);
    font-style: italic;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 13px;
    background: rgba(255, 255, 255, 0.02);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .transition-fade {
    animation: fadeIn 0.4s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
