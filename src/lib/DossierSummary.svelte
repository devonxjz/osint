<!-- frontend/src/lib/DossierSummary.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  // Find active profiles location if available
  let identifiedLocation = $derived(
    scanner.targetType === 'PHONE'
      ? (scanner.phoneDossier?.validation?.carrier
          ? `${scanner.phoneDossier.validation.carrier} | ${scanner.phoneDossier.callerId?.location || 'Global'}`
          : scanner.t.carrierMetadataResolved)
      : scanner.identityResult?.employer
        ? `${scanner.identityResult.employer}`
        : Object.values(scanner.results)
            .map(r => r.data?.location)
            .find(loc => !!loc) || scanner.t.footprintIdentified
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
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <h3 class="section-title" style="margin: 0;">{scanner.t.intelDossier}</h3>
      </div>
      <span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-weight: 700;">
        {scanner.t.complete}
      </span>
    </div>

    <div class="dossier-row">
      <!-- Target Avatar -->
      {#if targetAvatar}
        <img src={targetAvatar} class="dossier-avatar" alt="Target avatar preview" />
      {:else}
        <div class="dossier-avatar" style="background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; border-style: dashed; color: var(--text-secondary);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
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
          {scanner.t.type}: {scanner.targetType} | {identifiedLocation}
        </span>
      </div>
    </div>

    <!-- Identity Confidence Badge -->
    <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
      <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: {confidenceLevel === 'HIGH' ? 'rgba(16,185,129,0.12)' : confidenceLevel === 'MEDIUM' ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.12)'}; color: {confidenceColor};">
        {confidenceLevel === 'HIGH' ? scanner.t.confidenceHigh : confidenceLevel === 'MEDIUM' ? scanner.t.confidenceMedium : scanner.t.confidenceLow} {scanner.t.confidence}
      </span>
      <span style="font-size: 11px; color: var(--text-secondary);">
        {scanner.t.sources}: {sourcesText}
      </span>
    </div>

    <!-- Stats Grid -->
    <div class="dossier-stats-grid">
      <div class="dossier-stat-box">
        <span class="dossier-stat-num" style="color: var(--accent-green);">
          {targetStatFoundCount}
        </span>
        <div class="dossier-stat-lbl">{scanner.targetType === 'EMAIL' ? scanner.t.breachesFound : scanner.targetType === 'PHONE' ? scanner.t.ottAccounts : scanner.t.activeProfiles}</div>
      </div>
      <div class="dossier-stat-box">
        <span class="dossier-stat-num">
          {scanner.summary?.timeTakenMs ? parseFloat((scanner.summary.timeTakenMs / 1000).toFixed(2)) : parseFloat(((scanner.phoneDossier?.timeTakenMs || 0) / 1000).toFixed(2))}s
        </span>
        <div class="dossier-stat-lbl">{scanner.t.timeElapsed}</div>
      </div>
      {#if scanner.targetType === 'EMAIL' && scanner.breaches.length > 0}
        <div class="dossier-stat-box">
          <span class="dossier-stat-num" style="color: var(--accent-red, #ef4444);">
            {scanner.breaches.length}
          </span>
          <div class="dossier-stat-lbl">{scanner.t.breachesCount}</div>
        </div>
      {/if}
      {#if scanner.targetType === 'EMAIL' && (scanner.emailPermutations.workEmails.length + scanner.emailPermutations.personalEmails.length > 0)}
        <div class="dossier-stat-box">
          <span class="dossier-stat-num" style="color: var(--accent-purple);">
            {scanner.emailPermutations.workEmails.length + scanner.emailPermutations.personalEmails.length}
          </span>
          <div class="dossier-stat-lbl">{scanner.t.emailVariants}</div>
        </div>
      {/if}
    </div>

    <!-- Email Permutations (if any) -->
    {#if scanner.targetType === 'EMAIL' && (scanner.emailPermutations.workEmails.length > 0 || scanner.emailPermutations.personalEmails.length > 0)}
      <div style="margin-top: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">{scanner.t.relatedEmails}</div>
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
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      {scanner.t.exportPdf}
    </button>
  </div>
{/if}

