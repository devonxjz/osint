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
      <span>{scanner.isScanning ? scanner.t.liveShellActive : scanner.t.liveShellIdle}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      {#if scanner.logs.length > 0}
        <button
          type="button"
          class="copy-logs-btn"
          onclick={() => {
            const logText = scanner.logs.join('\n');
            navigator.clipboard.writeText(logText);
          }}
          style="display: flex; align-items: center; gap: 4px; font-family: var(--font-sans); font-size: 11px; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; transition: all 0.2s; font-weight: 600;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          {scanner.t.copyLogs}
        </button>
      {/if}
      <span class="card-category-tag" style="font-family: var(--font-mono); font-size: 11px; margin: 0;">
        {scanner.t.logsCount}: {scanner.logs.length}
      </span>
    </div>
  </div>

  <div class="console-terminal" bind:this={consoleTerminal}>
    {#if scanner.logs.length === 0}
      <span class="console-line" style="opacity: 0.5;">
        {scanner.t.awaitingLogs}
      </span>
    {:else}
      {#each scanner.logs as line}
        <span class="console-line {getLineClass(line)}">{line}</span>
      {/each}
    {/if}
  </div>
</div>

<style>
  .copy-logs-btn:hover {
    background: rgba(255, 255, 255, 0.12) !important;
  }
</style>
