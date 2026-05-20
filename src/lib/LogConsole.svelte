<!-- frontend/src/lib/LogConsole.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';

  let { scanner }: { scanner: ScannerState } = $props();

  let consoleTerminal: HTMLDivElement | null = $state(null);

  // Svelte 5 Rune $effect to handle auto-scrolling to the bottom as new logs arrive
  $effect(() => {
    if (scanner.logs && consoleTerminal) {
      consoleTerminal.scrollTop = consoleTerminal.scrollHeight;
    }
  });

  // Helper to determine log line style
  function getLineClass(line: string): string {
    if (line.includes('[✓]') || line.includes('FOUND')) return 'success';
    if (line.includes('[!]') || line.includes('ERROR')) return 'error';
    if (line.includes('[-]') || line.includes('canceled')) return 'warn';
    return '';
  }
</script>

<div class="console-card">
  <div class="console-header">
    <div class="console-title-indicator">
      {#if scanner.isScanning}
        <span class="pulse-red"></span>
      {/if}
      <span>Live Investigation Shell: {scanner.isScanning ? 'ACTIVE' : 'IDLE'}</span>
    </div>
    <span class="card-category-tag" style="font-family: var(--font-mono); font-size: 11px;">
      Logs: {scanner.logs.length}
    </span>
  </div>

  <div class="console-terminal" bind:this={consoleTerminal}>
    {#if scanner.logs.length === 0}
      <span class="console-line" style="opacity: 0.5;">
        [+] Awaiting target input to begin network intelligence scraping...
      </span>
    {:else}
      {#each scanner.logs as line}
        <span class="console-line {getLineClass(line)}">{line}</span>
      {/each}
    {/if}
  </div>
</div>
