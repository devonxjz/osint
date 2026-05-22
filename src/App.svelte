<!-- frontend/src/App.svelte -->

<script lang="ts">
  import { ScannerState } from './lib/scanner.svelte';
  import SearchBar from './lib/SearchBar.svelte';
  import CardGrid from './lib/CardGrid.svelte';
  import LogConsole from './lib/LogConsole.svelte';
  import BreachCard from './lib/BreachCard.svelte';
  import DossierSummary from './lib/DossierSummary.svelte';
  import PhoneDossierPanel from './lib/PhoneDossierPanel.svelte';
  import EmailDossierPanel from './lib/EmailDossierPanel.svelte';
  import IdentityDossierPanel from './lib/IdentityDossierPanel.svelte';
  import DomainDossierPanel from './lib/DomainDossierPanel.svelte';

  const scanner = new ScannerState(typeof window !== 'undefined' ? window.location.origin : '');
</script>

<div class="app-container">
  <!-- Elite SaaS Header Navbar -->
  <header class="navbar">
    <div class="logo-section">
      <div class="logo-badge">Ω</div>
      <h1 class="logo-title">Antigravity OSINT Intelligence Suite</h1>
    </div>
    
    <!-- Light/Dark Mode Switcher -->
    <button
      type="button"
      class="theme-btn"
      onclick={() => scanner.toggleTheme()}
      aria-label="Toggle visual theme mode"
    >
      {#if scanner.theme === 'dark'}
        ☀️
      {:else}
        🌙
      {/if}
    </button>
  </header>

  <!-- Module 7.1: SearchBar Component -->
  <SearchBar {scanner} />

  <!-- Live progress bar during active investigation scans -->
  {#if scanner.isScanning || (scanner.progress.completed > 0 && scanner.progress.completed < scanner.progress.total)}
    <div class="progress-card">
      <div class="progress-info">
        <span style="color: var(--text-primary);">Scanning target digital profiles...</span>
        <span style="color: var(--accent-blue);">
          {#if scanner.etaSeconds !== null}
            <span style="margin-right: 8px; color: var(--accent-purple);">ETA: {scanner.etaSeconds}s |</span>
          {/if}
          {scanner.progress.completed} / {scanner.progress.total} platforms ({scanner.progress.percentage}%)
        </span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: {scanner.progress.percentage}%"></div>
      </div>
    </div>
  {/if}

  <!-- Main Multi-Column Workspace Grid -->
  <main class="dashboard-grid">
    <!-- Left Column: Contextual Intelligence Output -->
    <div style="display: flex; flex-direction: column; gap: 32px;">
      {#if scanner.targetType === 'PHONE'}
        <PhoneDossierPanel {scanner} />
      {:else if scanner.targetType === 'EMAIL'}
        <EmailDossierPanel {scanner} />
      {:else if scanner.targetType === 'REAL_NAME'}
        <IdentityDossierPanel {scanner} />
      {:else if scanner.targetType === 'DOMAIN'}
        <DomainDossierPanel {scanner} />
      {:else}
        <CardGrid {scanner} />
      {/if}
    </div>

    <!-- Right Column: Operational Control Panel -->
    <div style="display: flex; flex-direction: column; gap: 32px;">
      <LogConsole {scanner} />
      <DossierSummary {scanner} />
      <BreachCard {scanner} />
    </div>
  </main>
</div>

