<!-- frontend/src/lib/IdentityDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let dossier = $derived(scanner.identityDossier);
  let foundProfiles = $derived(dossier?.found || []);
  let confidence = $derived(dossier?.confidence || 'LOW');

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="identity-dossier-wrapper">
  {#if scanner.target.trim()}
    <!-- SECTION 1: Target Identity Header -->
    <div class="glass-panel main-header-panel">
      <div class="status-indicator">
        <span class="pulse-dot" class:active={scanner.isScanning}></span>
        <span class="status-text">{scanner.isScanning ? 'Gathering Profiles...' : 'Scan Complete'}</span>
      </div>
      <h2 class="target-title-display">
        👤 {scanner.target.trim()}
      </h2>
      <div class="metadata-grid">
        <div class="meta-item">
          <span class="meta-label">Target Type</span>
          <span class="meta-value domain-pill">Real Name Identity</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Profiles Discovered</span>
          <span class="meta-value" style="color: {foundProfiles.length > 0 ? 'var(--accent-green)' : 'var(--text-secondary)'}">
            {foundProfiles.length} Account(s)
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Confidence Score</span>
          <span class="meta-value confidence-badge {confidence.toLowerCase()}">
            {confidence}
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Confidence Rating -->
    <div class="glass-panel confidence-card transition-fade">
      <h3 class="panel-section-title">🛡️ Digital Footprint Confidence Rating</h3>
      <p class="panel-section-subtitle">
        Confidence score evaluates name matches and contextual keywords found in bio descriptions across 15 high-value platforms.
      </p>

      <div class="confidence-glow-container {confidence.toLowerCase()}">
        <div class="confidence-info-layout">
          <div class="badge-icon">
            {#if confidence === 'HIGH'}
              🔥
            {:else}
              ⚡
            {/if}
          </div>
          <div class="badge-texts">
            <span class="confidence-level-text">{confidence} CONFIDENCE MATCH</span>
            <span class="confidence-description">
              {#if confidence === 'HIGH'}
                Multiple profiles found with bio descriptions confirming target's full name. High probability of true identity correlation.
              {:else if confidence === 'MEDIUM'}
                Profiles found with username variants. Contextual data is partially complete. Moderate probability of correct correlation.
              {:else}
                No strong contextual verification found. Results may contain false-positive username collisions.
              {/if}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 3: Matched Social Profiles -->
    <div class="glass-panel matches-panel transition-fade">
      <h3 class="panel-section-title">🌐 Discovered Digital Profiles</h3>
      <p class="panel-section-subtitle">
        Active accounts found across high-value social, tech, and creative networks matching candidate username variants.
      </p>

      {#if foundProfiles.length > 0}
        <div class="profiles-grid">
          {#each foundProfiles as profile}
            <div class="profile-card">
              <div class="profile-card-header">
                <div class="profile-avatar-wrapper">
                  {#if profile.avatar}
                    <img src={profile.avatar} alt={profile.platform} class="profile-avatar-img" />
                  {:else}
                    <div class="profile-avatar-placeholder">
                      {profile.platform.slice(0, 2).toUpperCase()}
                    </div>
                  {/if}
                </div>
                <div class="profile-platform-info">
                  <span class="profile-platform-name">{profile.platform}</span>
                  <span class="profile-platform-variant">@{profile.variant}</span>
                </div>
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="profile-action-btn"
                  title="Investigate profile link"
                >
                  Inspect ↗
                </a>
              </div>

              {#if profile.bio || profile.location}
                <div class="profile-card-body">
                  {#if profile.bio}
                    <p class="profile-bio-text">"{profile.bio}"</p>
                  {/if}
                  {#if profile.location}
                    <div class="profile-location">
                      📍 {profile.location}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else if scanner.isScanning}
        <div class="loading-placeholder">
          <div class="spinner-small"></div>
          <span>Querying high-value networks sequentially...</span>
        </div>
      {:else}
        <span class="no-results-msg">No active social media footprints resolved for this target name.</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .identity-dossier-wrapper {
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

  .confidence-badge {
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: 13px;
  }

  .confidence-badge.high {
    color: var(--accent-green);
  }

  .confidence-badge.medium {
    color: var(--accent-blue);
  }

  .confidence-badge.low {
    color: var(--text-secondary);
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

  /* --- Confidence Glow Container --- */
  .confidence-glow-container {
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
  }

  .confidence-glow-container.high {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%);
    border-color: rgba(16, 185, 129, 0.2);
    box-shadow: inset 0 0 12px rgba(16, 185, 129, 0.05);
  }

  .confidence-glow-container.medium {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%);
    border-color: rgba(99, 102, 241, 0.2);
    box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.05);
  }

  .confidence-glow-container.low {
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, rgba(148, 163, 184, 0.02) 100%);
    border-color: rgba(148, 163, 184, 0.2);
  }

  .confidence-info-layout {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .badge-icon {
    font-size: 32px;
  }

  .badge-texts {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .confidence-level-text {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--text-primary);
  }

  .confidence-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  /* --- Profiles Grid --- */
  .profiles-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .profile-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s ease;
  }

  .profile-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(99, 102, 241, 0.15);
  }

  .profile-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .profile-avatar-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
  }

  .profile-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-avatar-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 12px;
  }

  .profile-platform-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }

  .profile-platform-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .profile-platform-variant {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .profile-action-btn {
    padding: 6px 12px;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 6px;
    color: var(--accent-blue);
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .profile-action-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-blue);
  }

  .profile-card-body {
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .profile-bio-text {
    margin: 0;
    line-height: 1.5;
    font-style: italic;
  }

  .profile-location {
    font-size: 11px;
    color: var(--text-secondary);
  }

  /* --- Placeholders & Loading --- */
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
