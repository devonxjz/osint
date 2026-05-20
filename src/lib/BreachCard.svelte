<!-- frontend/src/lib/BreachCard.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();
</script>

{#if scanner.targetType === 'EMAIL' && scanner.breaches.length > 0}
  <div class="breaches-section">
    <div class="section-headline-group">
      <h3 class="section-title" style="color: var(--accent-red);">
        ⚠️ Compromised Database Incidents ({scanner.breaches.length})
      </h3>
      <span class="status-badge" style="background: rgba(239, 68, 68, 0.1); color: var(--accent-red); font-weight: 700;">
        Critical Threats
      </span>
    </div>

    {#each scanner.breaches as breach}
      <div class="breach-alert-card">
        <div class="breach-card-header">
          <span>{breach.name}</span>
          <span class="breach-card-date">{breach.date}</span>
        </div>
        <p class="breach-card-desc">{breach.description}</p>
        <div class="breach-tags-wrapper">
          {#each breach.dataClasses as dataClass}
            <span class="breach-tag">{dataClass}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
