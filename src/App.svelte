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
  import ScannerDossierPanel from './lib/ScannerDossierPanel.svelte';

  const scanner = new ScannerState(typeof window !== 'undefined' ? window.location.origin : '');
</script>

<div class="app-container">
  <!-- Elite SaaS Header Navbar -->
  <header class="navbar">
    <div class="logo-section">
      <div class="logo-badge">Ω</div>
      <h1 class="logo-title">{scanner.t.appTitle}</h1>
    </div>
    
    <div class="nav-controls">
      <!-- Language Switcher -->
      <button
        type="button"
        class="lang-btn"
        onclick={() => scanner.toggleLanguage()}
        aria-label={scanner.t.toggleLang}
      >
        <span style="display: flex; align-items: center; gap: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          {#if scanner.language === 'vi'}
            VI
          {:else}
            EN
          {/if}
        </span>
      </button>

      <!-- Light/Dark Mode Switcher -->
      <button
        type="button"
        class="theme-btn"
        onclick={() => scanner.toggleTheme()}
        aria-label={scanner.t.toggleTheme}
      >
        {#if scanner.theme === 'dark'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        {/if}
      </button>
    </div>
  </header>

  <!-- Module 7.1: SearchBar Component -->
  <SearchBar {scanner} />

  <!-- Live progress bar during active investigation scans -->
  {#if scanner.isScanning || (scanner.progress.completed > 0 && scanner.progress.completed < scanner.progress.total)}
    <div class="progress-card">
      <div class="progress-info">
        <span style="color: var(--text-primary);">{scanner.t.scanningTarget}</span>
        <span style="color: var(--accent-blue);">
          {#if scanner.etaSeconds !== null}
            <span style="margin-right: 8px; color: var(--accent-purple);">{scanner.t.eta}: {scanner.etaSeconds}s |</span>
          {/if}
          {scanner.progress.completed} / {scanner.progress.total} {scanner.t.platforms} ({scanner.progress.percentage}%)
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
      {:else if scanner.targetType === 'SCANNER'}
        <ScannerDossierPanel {scanner} />
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

