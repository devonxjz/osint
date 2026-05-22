<!-- frontend/src/lib/DomainDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let dossier = $derived(scanner.domainDossier);
  let whois = $derived(dossier?.whois);
  let subdomains = $derived(dossier?.subdomains || []);
  let certificates = $derived(dossier?.certificates || []);
  let wildcardDetected = $derived(dossier?.wildcardDetected || false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="domain-dossier-wrapper">
  {#if scanner.target.trim()}
    <!-- SECTION 1: Target Header Panel -->
    <div class="glass-panel main-header-panel">
      <div class="status-indicator">
        <span class="pulse-dot" class:active={scanner.isScanning}></span>
        <span class="status-text">{scanner.isScanning ? 'Auditing Infrastructure...' : 'Audit Complete'}</span>
      </div>
      <h2 class="target-title-display">
        🌐 {scanner.target.trim()}
      </h2>
      <div class="metadata-grid">
        <div class="meta-item">
          <span class="meta-label">Target Type</span>
          <span class="meta-value domain-pill">Domain Infrastructure</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Subdomains Resolved</span>
          <span class="meta-value" style="color: {subdomains.length > 0 ? 'var(--accent-green)' : 'var(--text-secondary)'}">
            {subdomains.length} Node(s)
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Wildcard DNS Status</span>
          <span class="meta-value" style="color: {wildcardDetected ? 'var(--accent-orange)' : 'var(--accent-green)'}">
            {wildcardDetected ? '⚠️ Detected' : '✓ Clean (Direct)'}
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 2: WHOIS Domain Metadata -->
    {#if whois || scanner.isScanning}
      <div class="glass-panel whois-panel transition-fade">
        <h3 class="panel-section-title">📅 WHOIS Domain Registration</h3>
        {#if whois}
          <div class="identity-info-grid">
            <div class="details-list">
              <div class="detail-row">
                <span class="row-lbl">Registrar:</span>
                <span class="row-val">{whois.registrar || 'Unknown'}</span>
              </div>
              {#if whois.created}
                <div class="detail-row">
                  <span class="row-lbl">Created Date:</span>
                  <span class="row-val font-mono">{new Date(whois.created).toLocaleDateString()}</span>
                </div>
              {/if}
              {#if whois.nameservers && whois.nameservers.length > 0}
                <div class="detail-row">
                  <span class="row-lbl">Nameservers:</span>
                  <span class="row-val font-mono">{whois.nameservers.join(', ')}</span>
                </div>
              {/if}
              {#if whois.status && whois.status.length > 0}
                <div class="detail-row">
                  <span class="row-lbl">Registry Status:</span>
                  <span class="row-val font-mono text-sm" style="color: var(--accent-blue);">
                    {whois.status.join(', ')}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <span>Querying HTTPS WHOIS directory...</span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- SECTION 3: Subdomain Resolution Matrix -->
    <div class="glass-panel subdomains-panel transition-fade">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h3 class="panel-section-title" style="margin: 0;">📡 Resolved Subdomains</h3>
          <p class="panel-section-subtitle" style="margin-top: 4px;">
            Active subdomains discovered through certificate logs and DNS brute force (Capped at top 10 for render safety).
          </p>
        </div>
        {#if wildcardDetected}
          <span class="status-badge wildcard-badge">Wildcard Proxy Bypass Active</span>
        {/if}
      </div>

      {#if subdomains.length > 0}
        <div class="subdomains-grid">
          {#each subdomains as sub}
            <div class="subdomain-card">
              <div class="subdomain-info">
                <span class="subdomain-name">{sub.subdomain}</span>
                <span class="subdomain-ip font-mono">IP: {sub.ip}</span>
              </div>
              <div class="badge-row">
                {#if sub.isCloudflare}
                  <span class="status-badge cf-badge">🌐 Cloudflare CDN Proxy</span>
                {:else}
                  <span class="status-badge direct-badge">Direct IP Node</span>
                {/if}
                <a
                  href="http://{sub.subdomain}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inspect-link"
                >
                  Visit ↗
                </a>
              </div>
            </div>
          {/each}
        </div>
      {:else if scanner.isScanning}
        <div class="loading-placeholder">
          <div class="spinner-small"></div>
          <span>Brute-forcing and filtering subdomains...</span>
        </div>
      {:else}
        <span class="no-results-msg">No active subdomains resolved for this domain target.</span>
      {/if}
    </div>

    <!-- SECTION 4: Certificate Log Audit -->
    {#if certificates.length > 0 || scanner.isScanning}
      <div class="glass-panel certs-panel transition-fade">
        <h3 class="panel-section-title">🔒 Certificate Log Audit</h3>
        <p class="panel-section-subtitle">
          Recorded Certificate Authority logs compiled from CT log registries (Capped at top 15 for render safety).
        </p>

        {#if certificates.length > 0}
          <div class="certs-list">
            {#each certificates as cert}
              <div class="cert-row">
                <span class="cert-host font-mono">{cert.subdomain}</span>
                <span class="cert-ip font-mono">{cert.ip}</span>
                {#if cert.isCloudflare}
                  <span class="cf-indicator">Cloudflare</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <span>Interrogating Certificate Logs...</span>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .domain-dossier-wrapper {
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

  /* --- Details Rows --- */
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
    text-align: right;
  }

  /* --- Subdomain Grid --- */
  .subdomains-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .subdomain-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    transition: all 0.2s ease;
  }

  .subdomain-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(99, 102, 241, 0.15);
  }

  .subdomain-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .subdomain-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .subdomain-ip {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
  }

  .cf-badge {
    background: rgba(99, 102, 241, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(99, 102, 241, 0.25);
  }

  .direct-badge {
    background: rgba(148, 163, 184, 0.15);
    color: var(--text-secondary);
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .wildcard-badge {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-orange);
    border: 1px solid rgba(245, 158, 11, 0.25);
  }

  .inspect-link {
    font-size: 11px;
    color: var(--accent-blue);
    text-decoration: none;
    font-weight: 700;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .inspect-link:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: rgba(99, 102, 241, 0.2);
  }

  /* --- Certs Log --- */
  .certs-list {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.03);
    overflow: hidden;
  }

  .cert-row {
    display: grid;
    grid-template-columns: 1fr 120px 80px;
    font-size: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    align-items: center;
  }

  .cert-row:last-child {
    border-bottom: none;
  }

  .cert-host {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cert-ip {
    color: var(--text-secondary);
  }

  .cf-indicator {
    color: var(--accent-blue);
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 800;
  }

  /* --- Placeholders & Spinners --- */
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
