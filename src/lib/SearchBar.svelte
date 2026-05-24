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
    <span class="search-icon-indicator">
      {#if scanner.targetType === 'EMAIL'}
        📧
      {:else if scanner.targetType === 'PHONE'}
        📞
      {:else}
        {#if scanner.targetType === 'DOMAIN'}
          🌐
        {:else if scanner.targetType === 'USERNAME'}
          👤
        {:else}
          🔍
        {/if}
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

