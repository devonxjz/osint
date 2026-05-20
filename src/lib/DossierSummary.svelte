<!-- frontend/src/lib/DossierSummary.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  // Find active profiles location if available
  let identifiedLocation = $derived(
    Object.values(scanner.results)
      .map(r => r.data?.location)
      .find(loc => !!loc) || 'Footprint Identified'
  );
</script>

{#if scanner.summary}
  <div class="dossier-card">
    <div class="section-headline-group" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
      <h3 class="section-title">🕵️ Dossier Dossier Ready</h3>
      <span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-weight: 700;">
        Complete
      </span>
    </div>

    <div class="dossier-row">
      <!-- Target Avatar (plucked from GitHub or Gravatar) -->
      {#if scanner.avatarUrl}
        <img src={scanner.avatarUrl} class="dossier-avatar" alt="Target avatar preview" />
      {:else}
        <div class="dossier-avatar" style="background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; border-style: dashed; color: var(--text-secondary);">
          👥
        </div>
      {/if}
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 18px; font-weight: 700; color: var(--text-primary);">
          {scanner.target.trim()}
        </span>
        <span class="card-category-tag">
          Type: {scanner.targetType} | {identifiedLocation}
        </span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="dossier-stats-grid">
      <div class="dossier-stat-box">
        <span class="dossier-stat-num" style="color: var(--accent-green);">
          {scanner.summary.foundCount}
        </span>
        <div class="dossier-stat-lbl">Active Profiles</div>
      </div>
      <div class="dossier-stat-box">
        <span class="dossier-stat-num">
          {parseFloat((scanner.summary.timeTakenMs / 1000).toFixed(2))}s
        </span>
        <div class="dossier-stat-lbl">Time Elapsed</div>
      </div>
    </div>

    <!-- Export PDF Trigger -->
    <button
      type="button"
      class="dossier-export-btn"
      onclick={() => scanner.downloadDossier()}
    >
      📄 Export Investigation PDF
    </button>
  </div>
{/if}
