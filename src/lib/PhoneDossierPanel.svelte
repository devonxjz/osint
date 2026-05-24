<!-- frontend/src/lib/PhoneDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let dossier = $derived(scanner.phoneDossier);
  let val = $derived(dossier?.validation);
  let caller = $derived(dossier?.callerId);
  let social = $derived(dossier?.socialSync);
  let people = $derived(dossier?.peopleSearch);
</script>

<div class="phone-dossier-wrapper">
  {#if dossier}
    <!-- SECTION 1: Carrier & Validation Gate -->
    <div class="glass-panel main-header-panel">
      <div class="status-indicator">
        <span class="pulse-dot" class:active={scanner.isScanning}></span>
        <span class="status-text">{scanner.isScanning ? scanner.t.scanInProgress : scanner.t.scanComplete}</span>
      </div>
      <h2 class="target-title-display">
        📞 {val?.formatted || dossier.phone}
      </h2>
      <div class="metadata-grid">
        <div class="meta-item">
          <span class="meta-label">{scanner.t.carrierNetwork}</span>
          <span class="meta-value carrier-pill">{val?.carrier || scanner.t.analyzing}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{scanner.t.countryCode}</span>
          <span class="meta-value">{val?.countryCode || scanner.t.resolving}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{scanner.t.registryValid}</span>
          <span class="meta-value" style="color: {val?.valid ? 'var(--accent-green)' : 'var(--text-secondary)'}">
            {val?.valid ? scanner.t.verifiedE164 : scanner.t.checking}
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Reverse Caller ID (Progressive disclosure) -->
    {#if caller && (caller.realName || scanner.isScanning)}
      <div class="glass-panel caller-identity-panel transition-fade">
        <h3 class="panel-section-title">{scanner.t.reverseCallerId}</h3>
        {#if caller.realName}
          <div class="identity-info-grid">
            <div class="identity-card-badge">
              <div class="avatar-stub">{caller.realName.slice(0, 2).toUpperCase()}</div>
              <div class="badge-text-group">
                <span class="id-name">{caller.realName}</span>
                <span class="id-loc">📍 {caller.location || scanner.t.unknownLocation}</span>
              </div>
            </div>
            <div class="details-list">
              <div class="detail-row">
                <span class="row-lbl">{scanner.t.confidenceRate}:</span>
                <span class="row-val confidence-high">{scanner.t.confidenceHigh}</span>
              </div>
              <div class="detail-row">
                <span class="row-lbl">{scanner.t.resolutionSources}:</span>
                <span class="row-val font-mono">{(caller.sources || []).join(', ') || scanner.t.none}</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <span>{scanner.t.interrogatingCallerDirs}</span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- SECTION 3: Simulated OTT Profiles & Facebook Discovery -->
    {#if social && ((social.ottProfiles && social.ottProfiles.length > 0) || social.facebook?.profileUrl || scanner.isScanning)}
      <div class="glass-panel social-profiles-panel transition-fade">
        <h3 class="panel-section-title">{scanner.t.socialOttSync}</h3>
        
        <!-- OTT Platforms Grid -->
        <div class="ott-grid">
          {#if social.ottProfiles && social.ottProfiles.length > 0}
            {#each social.ottProfiles as profile}
              <div class="ott-profile-card">
                <img
                  src={profile.avatarUrl || 'https://i.pravatar.cc/150?u=' + profile.username}
                  alt={profile.displayName}
                  class="ott-avatar"
                />
                <div class="ott-info">
                  <span class="ott-app-tag" class:tag-zalo={profile.app === 'Zalo'} class:tag-tg={profile.app === 'Telegram'} class:tag-wa={profile.app === 'WhatsApp'}>
                    {profile.app}
                  </span>
                  <span class="ott-display-name">{profile.displayName}</span>
                  <span class="ott-username">@{profile.username}</span>
                </div>
              </div>
            {/each}
          {:else if scanner.isScanning}
            <div class="loading-placeholder">
              <div class="spinner-small"></div>
              <span>{scanner.t.simulatingContactSync}</span>
            </div>
          {:else}
            <span class="no-results-msg">{scanner.t.noOttMessenger}</span>
          {/if}
        </div>

        <!-- Facebook entity discover card -->
        {#if social.facebook && social.facebook.profileUrl}
          <div class="facebook-match-banner">
            <div class="fb-icon">f</div>
            <div class="fb-details">
              <span class="fb-title">{scanner.t.fbMatchBanner}</span>
              <span class="fb-candidate">{scanner.t.fbCandidate}: <strong>{social.facebook.candidateName}</strong></span>
              <span class="fb-fanpage">{scanner.t.fbFanpage}: <em>{social.facebook.pageName}</em></span>
              <a href={social.facebook.profileUrl} target="_blank" rel="noopener noreferrer" class="fb-visit-btn">
                {scanner.t.visitProfileBtn}
              </a>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- SECTION 4: Google Dorking Links Panel (Progressive disclosure) -->
    {#if people && (people.dorkUrls && people.dorkUrls.length > 0)}
      <div class="glass-panel dork-links-panel transition-fade">
        <h3 class="panel-section-title">{scanner.t.googleDorking}</h3>
        <p class="panel-section-subtitle">
          {scanner.t.googleDorkingSubtitle}
        </p>

        <div class="dork-badge-grid">
          {#each people.dorkUrls as dorkUrl, i}
            {@const label = i === 0 ? scanner.t.dorkDirs : i === 1 ? scanner.t.dorkSocial : i === 2 ? scanner.t.dorkEmployer : scanner.t.dorkAltNames}
            <a
              href={dorkUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="dork-badge-card"
            >
              <div class="dork-badge-header">
                <span class="dork-badge-indicator">DORK {i + 1}</span>
                <span class="dork-icon">↗</span>
              </div>
              <span class="dork-badge-label">{label}</span>
              <span class="dork-badge-description">{scanner.t.dorkDescription}</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* --- Premium HSL Glassmorphism Stylings --- */
  .phone-dossier-wrapper {
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

  .carrier-pill {
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

  /* --- Caller ID Panel Styles --- */
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
  }

  .id-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .id-loc {
    font-size: 12px;
    color: var(--text-secondary);
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

  .confidence-high {
    color: var(--accent-green);
    background: rgba(16, 185, 129, 0.1);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
  }

  /* --- OTT Messenger Styles --- */
  .ott-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .ott-profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px;
    border-radius: 12px;
    transition: background 0.2s ease;
  }

  .ott-profile-card:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .ott-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.08);
    background-color: rgba(255, 255, 255, 0.05);
  }

  .ott-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .ott-app-tag {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 4px;
    width: fit-content;
    letter-spacing: 0.02em;
  }

  .tag-zalo {
    background: rgba(0, 102, 204, 0.15);
    color: #3399ff;
  }

  .tag-tg {
    background: rgba(0, 136, 204, 0.15);
    color: #33b5e5;
  }

  .tag-wa {
    background: rgba(37, 211, 102, 0.15);
    color: #2ecf70;
  }

  .ott-display-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .ott-username {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .facebook-match-banner {
    display: flex;
    gap: 16px;
    background: linear-gradient(135deg, rgba(24, 119, 242, 0.08) 0%, rgba(24, 119, 242, 0.02) 100%);
    border: 1px solid rgba(24, 119, 242, 0.2);
    padding: 16px;
    border-radius: 12px;
    margin-top: 16px;
  }

  .fb-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #1877f2;
    color: #fff;
    font-size: 22px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
  }

  .fb-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .fb-title {
    font-size: 14px;
    font-weight: 800;
    color: #1877f2;
  }

  .fb-candidate {
    font-size: 13px;
    color: var(--text-primary);
  }

  .fb-fanpage {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .fb-visit-btn {
    font-size: 11px;
    font-weight: 700;
    color: #1877f2;
    text-decoration: none;
    margin-top: 6px;
    width: fit-content;
    border: 1px solid rgba(24, 119, 242, 0.3);
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(24, 119, 242, 0.05);
    transition: all 0.2s ease;
  }

  .fb-visit-btn:hover {
    background: #1877f2;
    color: #fff;
    border-color: #1877f2;
  }

  /* --- Dork Links Styling --- */
  .dork-badge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .dork-badge-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    padding: 16px;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dork-badge-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--accent-purple);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
  }

  .dork-badge-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dork-badge-indicator {
    font-size: 9px;
    font-weight: 800;
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }

  .dork-icon {
    font-size: 12px;
    color: var(--text-secondary);
    transition: transform 0.2s ease;
  }

  .dork-badge-card:hover .dork-icon {
    transform: translate(2px, -2px);
    color: #c084fc;
  }

  .dork-badge-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .dork-badge-description {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.4;
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
