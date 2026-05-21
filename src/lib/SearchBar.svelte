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
      <span class="filter-label">Target Investigation Types</span>
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
      placeholder="Enter target username, email address, phone number (+84...), or domain name"
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
        Cancel
      </button>
    {:else}
      <button
        type="button"
        class="scan-action-btn"
        disabled={!scanner.target.trim() || (scanner.targetType === 'USERNAME' && scanner.categories.length === 0)}
        onclick={() => scanner.startScan()}
      >
        Scan
      </button>
    {/if}
  </div>
</div>

