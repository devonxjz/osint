<!-- frontend/src/lib/SearchBar.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let categoriesList = $derived(
    scanner.allCategories.length > 0
      ? scanner.allCategories
      : ['Tech', 'Social', 'Gaming', 'Media']
  );

  function toggleCategory(category: string) {
    if (scanner.isScanning) return; // Prevent filters modification during active scans
    
    if (scanner.categories.includes(category)) {
      scanner.categories = scanner.categories.filter(c => c !== category);
    } else {
      scanner.categories = [...scanner.categories, category];
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && scanner.target.trim() && !scanner.isScanning) {
      scanner.startScan();
    }
  }
</script>

<div class="search-card">
  {#if scanner.targetType === 'USERNAME' || scanner.targetType === null || !scanner.target.trim()}
    <div class="category-filter-row">
      <span class="filter-label">{scanner.t.targetInvestTypes}</span>
      <div class="chips-container">
        {#each categoriesList as category}
          <button
            type="button"
            class="chip"
            class:selected={scanner.categories.includes(category)}
            disabled={scanner.isScanning}
            onclick={() => toggleCategory(category)}
          >
            {category}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="search-box-wrapper">
    <!-- Dynamic Icon Indicator based on validation type -->
    <span class="search-icon-indicator" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: var(--text-secondary); top: 50%; transform: translateY(-50%);">
      {#if scanner.targetType === 'EMAIL'}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
      {:else if scanner.targetType === 'PHONE'}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      {:else if scanner.targetType === 'DOMAIN'}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      {:else if scanner.targetType === 'USERNAME'}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      {/if}
    </span>
    
    <input
      type="text"
      class="search-input"
      placeholder={scanner.t.placeholderInput}
      disabled={scanner.isScanning}
      bind:value={scanner.target}
      onkeydown={handleKeyDown}
    />

    {#if scanner.isScanning}
      <button
        type="button"
        class="scan-cancel-btn"
        onclick={() => scanner.cancelScan()}
      >
        {scanner.t.cancel}
      </button>
    {:else}
      <button
        type="button"
        class="scan-action-btn"
        disabled={!scanner.target.trim() || (scanner.targetType === 'USERNAME' && scanner.categories.length === 0)}
        onclick={() => scanner.startScan()}
      >
        {scanner.t.scan}
      </button>
    {/if}
  </div>

  {#if scanner.targetType === 'REAL_NAME' || scanner.targetType === 'DOMAIN'}
    <div class="deep-scan-row">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
        <span class="deep-scan-label">{scanner.t.deepScanActive}</span>
        <span class="deep-scan-hint">
          {scanner.targetType === 'REAL_NAME' 
            ? scanner.t.deepScanRealNameHint 
            : scanner.t.deepScanDomainHint}
        </span>
      </div>
      <label class="switch">
        <input 
          type="checkbox" 
          bind:checked={scanner.deepScanEnabled} 
          disabled={scanner.isScanning}
        />
        <span class="slider round"></span>
      </label>
    </div>
  {/if}
</div>

<style>
  .deep-scan-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px 18px;
    border-radius: 12px;
    margin-top: 12px;
    animation: slide-down 0.25s ease-out forwards;
  }

  .deep-scan-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .deep-scan-hint {
    font-size: 11px;
    color: var(--text-secondary);
  }

  /* The switch - the box around the slider */
  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 22px;
  }

  /* Hide default HTML checkbox */
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.08);
    transition: .3s;
    border: 1px solid var(--border-color);
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: var(--text-secondary);
    transition: .3s;
  }

  input:checked + .slider {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
  }

  input:checked + .slider:before {
    transform: translateX(22px);
    background-color: white;
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }

  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>

