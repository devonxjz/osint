<!-- frontend/src/lib/ScannerDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let rawData = $derived(scanner.rawScannerResult);
  let isScanning = $derived(scanner.isScanning);

  let searchFilter = $state('');
  let copied = $state(false);

  // Derive pretty-printed JSON or filtered JSON
  let formattedJson = $derived.by(() => {
    if (!rawData) return '';
    
    if (!searchFilter.trim()) {
      return JSON.stringify(rawData, null, 2);
    }
    
    // Apply search filter on keys or values
    try {
      const filtered: Record<string, any> = {};
      const lowerQuery = searchFilter.toLowerCase();
      
      // Perform a shallow filter for simple objects, or recursive search
      const searchRecursive = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) {
          return String(obj).toLowerCase().includes(lowerQuery) ? obj : undefined;
        }
        
        if (Array.isArray(obj)) {
          const res = obj.map(item => searchRecursive(item)).filter(item => item !== undefined);
          return res.length > 0 ? res : undefined;
        }
        
        const res: Record<string, any> = {};
        let hasMatches = false;
        for (const key of Object.keys(obj)) {
          const keyMatch = key.toLowerCase().includes(lowerQuery);
          const valRes = searchRecursive(obj[key]);
          
          if (keyMatch || valRes !== undefined) {
            res[key] = valRes !== undefined ? valRes : obj[key];
            hasMatches = true;
          }
        }
        return hasMatches ? res : undefined;
      };
      
      const filteredData = searchRecursive(rawData);
      return filteredData ? JSON.stringify(filteredData, null, 2) : '{}';
    } catch (e) {
      return JSON.stringify(rawData, null, 2);
    }
  });

  function copyToClipboard() {
    if (!formattedJson) return;
    navigator.clipboard.writeText(formattedJson).then(() => {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    });
  }

  function downloadJson() {
    if (!formattedJson) return;
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanner_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="scanner-dossier-wrapper">
  {#if scanner.target.trim()}
    <!-- Header panel with status indicator -->
    <div class="glass-panel main-header-panel">
      <div class="status-indicator">
        <span class="pulse-dot" class:active={isScanning}></span>
        <span class="status-text">{isScanning ? scanner.t.checking : scanner.t.scanComplete}</span>
      </div>
      <h2 class="target-title-display">
        🔍 {scanner.target.trim()}
      </h2>
      <div class="metadata-grid">
        <div class="meta-item">
          <span class="meta-label">Crawl Engine</span>
          <span class="meta-value domain-pill">EvasionClient (Chrome TLS)</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Format Mode</span>
          <span class="meta-value font-mono" style="color: var(--accent-purple);">RAW_JSON</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Auto UI Rendering</span>
          <span class="meta-value" style="color: var(--accent-orange);">DISABLED (Bypassed)</span>
        </div>
      </div>
    </div>

    <!-- JSON Interactive Viewer -->
    <div class="glass-panel json-viewer-panel">
      <div class="panel-header-controls">
        <h3 class="panel-section-title">Raw Scanner Result Stream</h3>
        
        <!-- Controls -->
        <div class="json-action-buttons">
          <input 
            type="text" 
            placeholder="Filter keys or values..." 
            bind:value={searchFilter} 
            class="json-filter-input"
            disabled={isScanning || !rawData}
          />
          <button 
            type="button" 
            class="action-btn-secondary" 
            onclick={copyToClipboard}
            disabled={!formattedJson}
          >
            {#if copied}
              ✓ Copied
            {:else}
              📋 Copy JSON
            {/if}
          </button>
          <button 
            type="button" 
            class="action-btn-primary" 
            onclick={downloadJson}
            disabled={!formattedJson}
          >
            💾 Download
          </button>
        </div>
      </div>

      {#if isScanning}
        <div class="loading-placeholder">
          <div class="spinner-small"></div>
          <span>Bypassing Cloudflare protections & retrieving raw scanner JSON payloads...</span>
        </div>
      {:else if rawData}
        <div class="json-code-container">
          <pre class="json-code-block"><code>{formattedJson}</code></pre>
        </div>
      {:else}
        <div class="no-results-msg">No scanner response payloads found. Make sure the backend endpoint is running.</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .glass-panel {
    background: var(--bg-card);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 30px;
    box-shadow: var(--shadow-md);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .main-header-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--text-secondary);
  }

  .pulse-dot.active {
    background-color: var(--accent-green);
    box-shadow: 0 0 12px var(--accent-green);
    animation: pulse 1.5s infinite;
  }

  .status-text {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-secondary);
  }

  .target-title-display {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    color: var(--text-primary);
    word-break: break-all;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .domain-pill {
    color: var(--accent-blue);
  }

  .json-viewer-panel {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel-header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 16px;
  }

  .panel-section-title {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent-purple));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .json-action-buttons {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .json-filter-input {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.3s;
    min-width: 180px;
  }

  .json-filter-input:focus {
    border-color: var(--accent-purple);
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.2);
  }

  .json-filter-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn-primary, .action-btn-secondary {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn-primary {
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    color: white;
    border: none;
  }

  .action-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .action-btn-secondary {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .action-btn-secondary:hover:not(:disabled) {
    border-color: var(--accent-purple);
    background: rgba(168, 85, 247, 0.05);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .json-code-container {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    max-height: 550px;
    overflow-y: auto;
    font-family: var(--font-mono);
  }

  .json-code-block {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 13px;
    line-height: 1.6;
    color: #a78bfa; /* Lavender color matching standard dark theme code display */
  }

  .loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
  }

  .spinner-small {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: var(--accent-purple);
    animation: spin 1s ease-in-out infinite;
  }

  .no-results-msg {
    color: var(--text-secondary);
    text-align: center;
    padding: 40px 20px;
    font-size: 14px;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.6; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
