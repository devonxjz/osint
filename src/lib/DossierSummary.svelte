<!-- frontend/src/lib/DossierSummary.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  // Find active profiles location if available
  let identifiedLocation = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.validation?.carrier
          ? `${scanner.phoneDossier.validation.carrier} | ${scanner.phoneDossier.callerId?.location || 'Global'}`
          : 'Carrier Metadata Resolved')
      : scanner.identityResult?.employer
        ? `${scanner.identityResult.employer}`
        : Object.values(scanner.results)
            .map(r => r.data?.location)
            .find(loc => !!loc) || 'Footprint Identified'
  );

  let confidenceLevel = $derived(
    scanner.targetType === 'PHONE' ? 'HIGH' : (scanner.identityResult?.confidence || 'LOW')
  );

  let confidenceColor = $derived(
    confidenceLevel === 'HIGH' ? 'var(--accent-green)' :
    confidenceLevel === 'MEDIUM' ? 'var(--accent-blue)' :
    'var(--text-secondary)'
  );

  let sourcesText = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.callerId?.sources || ['Twilio API', 'Seeded Sync']).join(', ')
      : (scanner.identityResult?.sources || []).join(', ') || 'None'
  );

  let targetDisplayName = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.callerId?.realName || scanner.target.trim())
      : (scanner.identityResult?.realName || scanner.target.trim())
  );

  let targetSubTitle = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.peopleSearch?.business || '')
      : (scanner.identityResult?.position || '')
  );

  let targetAvatar = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.socialSync?.ottProfiles?.[0]?.avatarUrl || null)
      : (scanner.avatarUrl || null)
  );

  let targetStatFoundCount = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.socialSync?.ottProfiles?.length || 0) + (scanner.phoneDossier?.socialSync?.facebook?.profileUrl ? 1 : 0)
      : (scanner.summary?.foundCount || 0)
  );
</script>

{#if scanner.summary || (scanner.targetType === 'PHONE' && scanner.phoneDossier)}
  <div class="dossier-card">
    <div class="section-headline-group" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
      <h3 class="section-title">🕵️ Intelligence Dossier</h3>
      <span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-weight: 700;">
        Complete
      </span>
    </div>

    <div class="dossier-row">
      <!-- Target Avatar -->
      {#if targetAvatar}
        <img src={targetAvatar} class="dossier-avatar" alt="Target avatar preview" />
      {:else}
        <div class="dossier-avatar" style="background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; border-style: dashed; color: var(--text-secondary);">
          👥
        </div>
      {/if}
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 18px; font-weight: 700; color: var(--text-primary);">
          {targetDisplayName}
        </span>
        {#if targetSubTitle}
          <span style="font-size: 13px; color: var(--text-secondary);">
            {targetSubTitle}
          </span>
        {/if}
        <span class="card-category-tag">
          Type: {scanner.targetType} | {identifiedLocation}
        </span>
      </div>
    </div>

    <!-- Identity Confidence Badge -->
    <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
      <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: {confidenceLevel === 'HIGH' ? 'rgba(16,185,129,0.12)' : confidenceLevel === 'MEDIUM' ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.12)'}; color: {confidenceColor};">
        {confidenceLevel} CONFIDENCE
      </span>
      <span style="font-size: 11px; color: var(--text-secondary);">
        Sources: {sourcesText}
      </span>
    </div>

    <!-- Stats Grid -->
    <div class="dossier-stats-grid">
      <div class="dossier-stat-box">
        <span class="dossier-stat-num" style="color: var(--accent-green);">
          {targetStatFoundCount}
        </span>
        <div class="dossier-stat-lbl">{scanner.targetType === 'EMAIL' ? 'Breaches Found' : scanner.targetType === 'PHONE' ? 'OTT Accounts' : 'Active Profiles'}</div>
      </div>
      <div class="dossier-stat-box">
        <span class="dossier-stat-num">
          {scanner.summary?.timeTakenMs ? parseFloat((scanner.summary.timeTakenMs / 1000).toFixed(2)) : parseFloat(((scanner.phoneDossier?.timeTakenMs || 0) / 1000).toFixed(2))}s
        </span>
        <div class="dossier-stat-lbl">Time Elapsed</div>
      </div>
      {#if scanner.targetType === 'EMAIL' && scanner.breaches.length > 0}
        <div class="dossier-stat-box">
          <span class="dossier-stat-num" style="color: var(--accent-red, #ef4444);">
            {scanner.breaches.length}
          </span>
          <div class="dossier-stat-lbl">Breach(es)</div>
        </div>
      {/if}
      {#if scanner.targetType === 'EMAIL' && (scanner.emailPermutations.workEmails.length + scanner.emailPermutations.personalEmails.length > 0)}
        <div class="dossier-stat-box">
          <span class="dossier-stat-num" style="color: var(--accent-purple);">
            {scanner.emailPermutations.workEmails.length + scanner.emailPermutations.personalEmails.length}
          </span>
          <div class="dossier-stat-lbl">Email Variants</div>
        </div>
      {/if}
    </div>

    <!-- Email Permutations (if any) -->
    {#if scanner.targetType === 'EMAIL' && (scanner.emailPermutations.workEmails.length > 0 || scanner.emailPermutations.personalEmails.length > 0)}
      <div style="margin-top: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Related Email Addresses</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          {#each scanner.emailPermutations.workEmails as email}
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--accent-blue);">{email}</span>
          {/each}
          {#each scanner.emailPermutations.personalEmails as email}
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(148,163,184,0.1); color: var(--text-secondary);">{email}</span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Export PDF Trigger -->
    <button
      type="button"
      class="dossier-export-btn"
      onclick={() => scanner.downloadDossier()}
    >
      📄 Export Classified Dossier PDF
    </button>
  </div>
{/if}

