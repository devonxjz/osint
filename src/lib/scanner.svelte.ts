// frontend/src/lib/scanner.svelte.ts

'use strict';

// --- Types ---
export type CardStatus = 'PENDING' | 'SCANNING' | 'FOUND' | 'NOT_FOUND';

export interface ScanResult {
  platform: string;
  status: 'FOUND' | 'NOT_FOUND';
  url: string;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  error?: string | null;
}

export interface Breach {
  name: string;
  date: string;
  description: string;
  dataClasses: string[];
}

export interface EmailScanResult {
  valid: boolean;
  type: 'EMAIL';
  sanitized: string;
  breachesCount: number;
  hasGravatar: boolean;
  avatarUrl: string | null;
}

export interface IdentityResult {
  realName: string | null;
  employer: string | null;
  position: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
}

export interface EmailDossier {
  email: string;
  validation: { syntaxValid: boolean; domainExists?: boolean | null; isDisposable?: boolean };
  breaches: Breach[];
  gravatar: { hasGravatar: boolean; avatarUrl: string | null; displayName?: string | null };
  identity: IdentityResult;
  usernames: { primary: string; variants: string[] };
  permutations: { workEmails: string[]; personalEmails: string[] };
  timeTakenMs: number;
  platformResults?: ScanResult[];
}

export interface PhoneDossier {
  phone: string;
  validation: { valid: boolean; formatted: string; countryCode: string; carrier: string };
  callerId?: { realName: string; location: string; carrier: string; sources: string[] };
  peopleSearch?: { name: string; realAddress: string; relatives: string[]; business: string; dorkUrls: string[] };
  socialSync?: { facebook: { profileUrl: string; pageName: string; candidateName: string }; ottProfiles: { app: string; username: string; displayName: string; avatarUrl: string }[] };
  timeTakenMs?: number;
}

export interface ScanSummary {
  foundCount: number;
  timeTakenMs: number;
}

export class ScannerState {
  // --- UI Reactive States (Svelte 5 Runes) ---
  target = $state('');
  categories = $state<string[]>([]);
  platforms = $state<{ name: string; category: string; requiresProxy?: boolean; envCookieKey?: string; riskLevel?: string; identifierType?: string }[]>([]);
  allCategories = $state<string[]>([]);
  sessionStatus = $state<Record<string, boolean>>({});
  cookieOverrides = $state<Record<string, string>>({});
  isScanning = $state(false);
  progress = $state({ completed: 0, total: 0, percentage: 0 });
  
  // Platform Results Grid State Machine Map
  results = $state<Record<string, { status: CardStatus; data?: ScanResult }>>({});
  
  // Log Console Logs
  logs = $state<string[]>([]);
  
  // Target Summary Statistics
  summary = $state<ScanSummary | null>(null);
  
  // Email-specific States
  emailScanResult = $state<EmailScanResult | null>(null);
  breaches = $state<Breach[]>([]);
  hasGravatar = $state(false);
  avatarUrl = $state<string | null>(null);
  emailDossier = $state<EmailDossier | null>(null);
  identityResult = $state<IdentityResult | null>(null);
  emailPermutations = $state<{ workEmails: string[]; personalEmails: string[] }>({ workEmails: [], personalEmails: [] });

  // Telephone-specific States
  phoneDossier = $state<PhoneDossier | null>(null);

  // Identity/Name-specific States
  identityDossier = $state<any>(null);
  deepScanEnabled = $state(false);

  // Domain-specific States
  domainDossier = $state<any>(null);

  // Global Theme Toggling State ('light' | 'dark')
  theme = $state<'light' | 'dark'>('dark');

  // Performance Buffering for Svelte UI 60FPS lock
  private progressBuffer: { completed: number; total: number; percentage: number } | null = null;
  private resultBuffer: ScanResult[] = [];
  private logBuffer: string[] = [];
  private rafHandle: number | null = null;

  // Scan timing for ETA
  scanStartTime = $state<number | null>(null);

  // Internal connection handle
  private eventSource: EventSource | null = null;

  // --- Derived Reactive States ---
  targetType = $derived(this.validateTarget());
  etaSeconds = $derived.by(() => {
    if (!this.isScanning || !this.scanStartTime || this.progress.completed === 0) return null;
    const elapsedMs = Date.now() - this.scanStartTime;
    const speed = this.progress.completed / (elapsedMs / 1000); // platforms scanned per second
    const remaining = this.progress.total - this.progress.completed;
    return speed > 0 ? Math.ceil(remaining / speed) : null;
  });

  constructor(private apiBase: string = 'http://localhost:3000') {
    // Automatically apply theme on init
    this.applyTheme();
    this.initializeData();
  }

  async initializeData() {
    try {
      const catsRes = await fetch(`${this.apiBase}/api/categories`);
      if (catsRes.ok) {
        this.allCategories = await catsRes.json();
        // Default to select all categories
        this.categories = [...this.allCategories];
      }

      const platRes = await fetch(`${this.apiBase}/api/platforms`);
      if (platRes.ok) {
        this.platforms = await platRes.json();
      }

      const sessRes = await fetch(`${this.apiBase}/api/session-status`);
      if (sessRes.ok) {
        this.sessionStatus = await sessRes.json();
      }

      // Load persistent browser cookie overrides
      this.loadCookieOverrides();
    } catch (err) {
      console.error('Failed to load dynamic data from backend API:', err);
    }
  }

  loadCookieOverrides() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('osint_cookie_overrides');
        if (stored) {
          this.cookieOverrides = JSON.parse(stored);
          // Mark status as active for any overriding keys
          for (const key of Object.keys(this.cookieOverrides)) {
            if (this.cookieOverrides[key]) {
              this.sessionStatus[key] = true;
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse cookie overrides from LocalStorage:', err);
      }
    }
  }

  saveCookieOverride(key: string, value: string) {
    this.cookieOverrides[key] = value;
    if (value) {
      this.sessionStatus[key] = true;
    } else {
      // Re-check backend status if override is cleared
      this.refreshSessionStatus();
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('osint_cookie_overrides', JSON.stringify(this.cookieOverrides));
    }
  }

  async refreshSessionStatus() {
    try {
      const sessRes = await fetch(`${this.apiBase}/api/session-status`);
      if (sessRes.ok) {
        const status = await sessRes.json();
        // Fall back to server status but respect other active front-end overrides
        for (const key of Object.keys(status)) {
          this.sessionStatus[key] = this.cookieOverrides[key] ? true : status[key];
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- Theme Controls ---
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (this.theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }

  // --- Scanning Methods ---
  private startUpdateLoop() {
    if (this.rafHandle !== null) return;

    const update = () => {
      // Flush progress
      if (this.progressBuffer !== null) {
        this.progress = this.progressBuffer;
        this.progressBuffer = null;
      }

      // Flush results
      if (this.resultBuffer.length > 0) {
        for (const res of this.resultBuffer) {
          const status: CardStatus = res.status === 'FOUND' ? 'FOUND' : 'NOT_FOUND';
          this.results[res.platform] = { status, data: res };
          
          if (res.avatar && !this.avatarUrl) {
            this.avatarUrl = res.avatar;
          }
        }
        this.resultBuffer = [];
      }

      // Flush logs
      if (this.logBuffer.length > 0) {
        this.logs = [...this.logs, ...this.logBuffer];
        this.logBuffer = [];
      }

      if (this.isScanning) {
        this.rafHandle = typeof window !== 'undefined' ? requestAnimationFrame(update) : setTimeout(update, 16) as any;
      } else {
        this.rafHandle = null;
      }
    };

    this.rafHandle = typeof window !== 'undefined' ? requestAnimationFrame(update) : setTimeout(update, 16) as any;
  }

  private flushBuffers() {
    if (this.progressBuffer !== null) {
      this.progress = this.progressBuffer;
      this.progressBuffer = null;
    }
    if (this.resultBuffer.length > 0) {
      for (const res of this.resultBuffer) {
        const status: CardStatus = res.status === 'FOUND' ? 'FOUND' : 'NOT_FOUND';
        this.results[res.platform] = { status, data: res };
        if (res.avatar && !this.avatarUrl) {
          this.avatarUrl = res.avatar;
        }
      }
      this.resultBuffer = [];
    }
    if (this.logBuffer.length > 0) {
      this.logs = [...this.logs, ...this.logBuffer];
      this.logBuffer = [];
    }
    if (this.rafHandle !== null) {
      if (typeof window !== 'undefined') {
        cancelAnimationFrame(this.rafHandle);
      } else {
        clearTimeout(this.rafHandle);
      }
      this.rafHandle = null;
    }
  }

  async startScan() {
    if (this.isScanning || !this.target.trim()) return;

    // Reset state before beginning
    this.isScanning = true;
    this.scanStartTime = Date.now();
    this.progress = { completed: 0, total: 0, percentage: 0 };
    this.results = {};
    this.logs = [`[+] Starting scan on target: "${this.target.trim()}"...`];
    this.summary = null;
    this.emailScanResult = null;
    this.breaches = [];
    this.hasGravatar = false;
    this.avatarUrl = null;
    this.emailDossier = null;
    this.identityResult = null;
    this.emailPermutations = { workEmails: [], personalEmails: [] };
    this.phoneDossier = null;
    this.identityDossier = null;
    this.domainDossier = null;

    // Initialize frame-buffers
    this.progressBuffer = null;
    this.resultBuffer = [];
    this.logBuffer = [];
    
    // Start RAF Update loop
    this.startUpdateLoop();

    // Route to appropriate endpoint based on input type
    if (this.targetType === 'EMAIL') {
      this.startEmailScan();
    } else if (this.targetType === 'PHONE') {
      this.startPhoneScan();
    } else if (this.targetType === 'REAL_NAME') {
      this.startRealNameScan();
    } else if (this.targetType === 'DOMAIN') {
      this.startDomainScan();
    } else {
      this.startUsernameScan();
    }
  }

  // ─── Email OSINT Pipeline ───
  private startEmailScan() {
    const queryParams = new URLSearchParams({ target: this.target.trim() });
    const url = `${this.apiBase}/api/scan-email?${queryParams.toString()}`;

    this.logs.push('[+] Routing to Email OSINT pipeline...');
    this.logs.push('[+] Establishing SSE stream for email intelligence...');

    // Set progress for email modules (6 modules total)
    this.progress = { completed: 0, total: 6, percentage: 0 };

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('result', (e: MessageEvent) => {
        this.handleEmailEvent(JSON.parse(e.data));
      });

      this.eventSource.addEventListener('end', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.handleEmailEnd(parsed.dossier);
      });

      this.eventSource.addEventListener('error', (e: Event) => {
        if (this.isScanning) {
          this.handleError('Email SSE stream connection error.');
        }
      });
    } catch (err: any) {
      this.handleError(err.message || 'Failed to initiate email SSE connection.');
    }
  }

  // ─── Telephone OSINT Pipeline ───
  private startPhoneScan() {
    const queryParams = new URLSearchParams({ target: this.target.trim() });
    const url = `${this.apiBase}/api/scan-phone?${queryParams.toString()}`;

    this.logs.push('[+] Routing to Telephone OSINT pipeline...');
    this.logs.push('[+] Establishing SSE stream for real-time phone intelligence...');

    // Initialize clean dossier shell
    this.phoneDossier = {
      phone: this.target.trim(),
      validation: { valid: false, formatted: '', countryCode: '', carrier: '' },
      callerId: { realName: '', location: '', carrier: '', sources: [] },
      peopleSearch: { name: '', realAddress: '', relatives: [], business: '', dorkUrls: [] },
      socialSync: { facebook: { profileUrl: '', pageName: '', candidateName: '' }, ottProfiles: [] }
    };

    // Set progress stages (5 operations total)
    this.progress = { completed: 0, total: 5, percentage: 0 };

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('result', (e: MessageEvent) => {
        this.handlePhoneEvent(JSON.parse(e.data));
      });

      this.eventSource.addEventListener('end', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.handlePhoneEnd(parsed.dossier);
      });

      this.eventSource.addEventListener('error', (e: Event) => {
        if (this.isScanning) {
          this.handleError('Telephone SSE stream connection error.');
        }
      });
    } catch (err: any) {
      this.handleError(err.message || 'Failed to initiate telephone SSE connection.');
    }
  }

  private handlePhoneEvent(event: { module: string; status: string; data: any }) {
    const { module, status, data } = event;

    this.progress = {
      completed: this.progress.completed + 1,
      total: 5,
      percentage: parseFloat((((this.progress.completed + 1) / 5) * 100).toFixed(1)),
    };

    if (!this.phoneDossier) return;

    switch (module) {
      case 'validation':
        this.phoneDossier.validation = data;
        this.logs.push(`[+] Validation: Carrier="${data.carrier}", Format="${data.formatted}"`);
        break;
      case 'caller_id':
        this.phoneDossier.callerId = data;
        if (data.realName) {
          this.logs.push(`[✓] Caller ID: Resolved real name "${data.realName}" (${data.location})`);
        } else {
          this.logs.push('[ ] Caller ID: No caller profile resolved');
        }
        break;
      case 'facebook':
        this.phoneDossier.socialSync = this.phoneDossier.socialSync || { facebook: { profileUrl: '', pageName: '', candidateName: '' }, ottProfiles: [] };
        this.phoneDossier.socialSync.facebook = data;
        if (data.profileUrl) {
          this.logs.push(`[✓] Facebook Discovery: Candidate found on profile: ${data.profileUrl}`);
        } else {
          this.logs.push('[ ] Facebook Discovery: No matches in simulated posts/pages');
        }
        break;
      case 'contact_sync':
        this.phoneDossier.socialSync = this.phoneDossier.socialSync || { facebook: { profileUrl: '', pageName: '', candidateName: '' }, ottProfiles: [] };
        this.phoneDossier.socialSync.ottProfiles = data.profiles || [];
        this.logs.push(`[✓] OTT Sync Simulation: Detected ${data.profiles?.length || 0} active OTT platform profile(s)`);
        break;
      case 'people_search':
        this.phoneDossier.peopleSearch = data;
        if (data.name) {
          this.logs.push(`[✓] People Search: Found address "${data.realAddress}" and compiled ${data.dorkUrls?.length || 0} Google Dorking queries`);
        } else {
          this.logs.push('[ ] People Search: No records resolved');
        }
        break;
    }
  }

  private handlePhoneEnd(dossier: PhoneDossier) {
    this.phoneDossier = dossier;
    this.summary = { foundCount: dossier.socialSync?.ottProfiles?.length || 0, timeTakenMs: dossier.timeTakenMs || 0 };
    this.isScanning = false;
    this.flushBuffers();

    this.logs.push(`[✓] Telephone OSINT completed in ${dossier.timeTakenMs || 0}ms.`);

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // ─── Username Platform Scan Pipeline ───
  private startUsernameScan() {
    const queryParams = new URLSearchParams({
      target: this.target.trim(),
      categories: this.categories.join(','),
      cookies: JSON.stringify(this.cookieOverrides)
    });

    const url = `${this.apiBase}/api/scan?${queryParams.toString()}`;
    
    this.logs.push('[+] Establishing persistent SSE stream channel...');
    
    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('progress', (e: MessageEvent) => {
        this.handleProgress(JSON.parse(e.data));
      });

      this.eventSource.addEventListener('result', (e: MessageEvent) => {
        this.handleResult(JSON.parse(e.data));
      });

      this.eventSource.addEventListener('end', (e: MessageEvent) => {
        this.handleEnd(JSON.parse(e.data));
      });

      this.eventSource.addEventListener('error', (e: Event) => {
        if (this.isScanning) {
          this.handleError('SSE Stream encountered a connection error.');
        }
      });
    } catch (err: any) {
      this.handleError(err.message || 'Failed to initiate SSE connection.');
    }
  }

  cancelScan() {
    if (!this.isScanning) return;
    
    // Close live stream socket
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isScanning = false;
    this.logs.push('[-] Scan canceled and socket closed by user.');
    this.flushBuffers();
  }

  // --- SSE Event Handlers ---
  private handleProgress(data: { completed: number; total: number; percentage: number }) {
    this.progressBuffer = data;
    this.logBuffer.push(`[+] Progress updated: ${data.completed}/${data.total} platforms checked (${data.percentage}%).`);
  }

  private handleResult(data: ScanResult & { responseTimeMs?: number }) {
    this.resultBuffer.push(data as any);

    const status = data.status === 'FOUND' ? 'FOUND' : 'NOT_FOUND';
    const timeStr = data.responseTimeMs !== undefined ? ` (${data.responseTimeMs}ms)` : '';

    if (status === 'FOUND') {
      this.logBuffer.push(`[✓] FOUND: ${data.platform} -> ${data.url}${timeStr}`);
    } else {
      this.logBuffer.push(`[ ] Checked ${data.platform}... NOT FOUND${timeStr}`);
    }
  }

  private handleError(message: string) {
    this.isScanning = false;
    this.flushBuffers();
    this.logs.push(`[!] ERROR: ${message}`);
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleEnd(data: { summary: ScanSummary }) {
    this.summary = data.summary;
    this.isScanning = false;
    this.flushBuffers();
    this.logs.push(`[✓] Scan completed in ${data.summary.timeTakenMs}ms. Found on ${data.summary.foundCount} platform(s).`);

    // Clean close
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // ─── Email-specific SSE Event Handlers ───
  private handleEmailEvent(event: { module: string; status: string; data: any }) {
    const { module, status, data } = event;

    this.progress = {
      completed: this.progress.completed + 1,
      total: 6,
      percentage: parseFloat((((this.progress.completed + 1) / 6) * 100).toFixed(1)),
    };

    switch (module) {
      case 'validation':
        this.logs.push(`[+] Email validation: ${status}`);
        break;
      case 'usernames':
        this.logs.push(`[+] Username extraction: primary="${data.primary}", ${data.variants?.length || 0} variants`);
        break;
      case 'breach':
        if (data.breaches && data.breaches.length > 0) {
          this.breaches = data.breaches.map((b: any) => ({
            name: b.name,
            date: b.breachDate || b.date,
            description: b.description?.replace(/<[^>]*>/g, '') || '',
            dataClasses: b.compromisedData || b.dataClasses || [],
          }));
          this.logs.push(`[!] BREACH ALERT: Found in ${data.breaches.length} breach(es)`);
        } else {
          this.logs.push('[✓] No breaches found');
        }
        break;
      case 'gravatar':
        this.hasGravatar = data.hasGravatar;
        this.avatarUrl = data.avatarUrl || null;
        this.logs.push(data.hasGravatar ? `[✓] Gravatar found: ${data.avatarUrl}` : '[ ] No Gravatar profile');
        break;
      case 'identity':
        this.identityResult = data;
        this.logs.push(data.realName ? `[✓] Identity resolved: ${data.realName} (${data.confidence})` : '[ ] Identity not resolved');
        break;
      case 'permutations':
        this.emailPermutations = data;
        const totalPerms = (data.workEmails?.length || 0) + (data.personalEmails?.length || 0);
        this.logs.push(`[+] Generated ${totalPerms} email permutations`);
        break;
    }
  }

  private handleEmailEnd(dossier: EmailDossier) {
    this.emailDossier = dossier;
    this.summary = { foundCount: dossier.breaches?.length || 0, timeTakenMs: dossier.timeTakenMs };
    this.isScanning = false;
    this.flushBuffers();

    this.emailScanResult = {
      valid: dossier.validation.syntaxValid,
      type: 'EMAIL',
      sanitized: dossier.email,
      breachesCount: dossier.breaches?.length || 0,
      hasGravatar: dossier.gravatar?.hasGravatar || false,
      avatarUrl: dossier.gravatar?.avatarUrl || null,
    };

    this.logs.push(`[✓] Email OSINT completed in ${dossier.timeTakenMs}ms. ${dossier.breaches?.length || 0} breach(es) found.`);

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // --- Trigger PDF Dossier Download ---
  async downloadDossier() {
    if (!this.emailDossier && !this.phoneDossier && !this.summary) return;
    this.logs.push('[+] Generating classified PDF dossier...');
    try {
      // Build dossier payload based on search target type
      let dossierData: any;

      if (this.phoneDossier) {
        dossierData = {
          phone: this.phoneDossier.phone,
          validation: this.phoneDossier.validation,
          callerId: this.phoneDossier.callerId,
          peopleSearch: this.phoneDossier.peopleSearch,
          socialSync: this.phoneDossier.socialSync,
          timeTakenMs: this.summary?.timeTakenMs || 0,
        };
      } else {
        dossierData = this.emailDossier || {
          email: this.target.trim(),
          validation: { syntaxValid: true },
          breaches: this.breaches.map(b => ({ name: b.name, breachDate: b.date, description: b.description, compromisedData: b.dataClasses, domain: '', pwnCount: 0, isVerified: true })),
          gravatar: { hasGravatar: this.hasGravatar, avatarUrl: this.avatarUrl },
          identity: this.identityResult || { realName: null, employer: null, position: null, confidence: 'LOW' as const, sources: [] },
          usernames: { primary: this.target.trim().split('@')[0] || '', variants: [] },
          permutations: this.emailPermutations,
          timeTakenMs: this.summary?.timeTakenMs || 0,
        };
      }

      const response = await fetch(`${this.apiBase}/api/dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dossierData),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dossier_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.logs.push('[✓] Classified dossier PDF downloaded successfully.');
    } catch (err: any) {
      this.logs.push(`[!] Dossier export failed: ${err.message}`);
    }
  }

  // --- Helper Methods ---
  private startRealNameScan() {
    const queryParams = new URLSearchParams({
      target: this.target.trim(),
      deep_scan: this.deepScanEnabled ? 'true' : 'false',
      cookies: JSON.stringify(this.cookieOverrides)
    });
    const url = `${this.apiBase}/api/scan?${queryParams.toString()}`;
    
    this.logs.push('[+] Routing to Identity Resolution (Real Name) pipeline...');
    this.logs.push('[+] Establishing SSE stream for identity scan...');
    
    this.progress = { completed: 0, total: 15, percentage: 0 };
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.addEventListener('progress', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.progress = parsed;
        this.logs.push(`[+] Progress updated: ${parsed.completed}/${parsed.total} platforms checked (${parsed.percentage}%).`);
      });
      
      this.eventSource.addEventListener('result', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.resultBuffer.push(parsed);
        const status = parsed.status === 'FOUND' ? '[✓] FOUND' : '[ ] NOT FOUND';
        this.logs.push(`${status}: ${parsed.platform} (${parsed.variant}) -> ${parsed.url}`);
      });
      
      this.eventSource.addEventListener('end', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.identityDossier = parsed.dossier;
        this.summary = { foundCount: parsed.dossier?.found?.length || 0, timeTakenMs: Date.now() - (this.scanStartTime || 0) };
        this.isScanning = false;
        this.flushBuffers();
        this.logs.push(`[✓] Identity scan complete. Confidence score: ${parsed.dossier?.confidence || 'LOW'}`);
        
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      });
      
      this.eventSource.addEventListener('error', (e: Event) => {
        if (this.isScanning) {
          this.handleError('SSE stream connection error during identity scan.');
        }
      });
    } catch (err: any) {
      this.handleError(err.message || 'Failed to initiate SSE connection.');
    }
  }

  private startDomainScan() {
    const queryParams = new URLSearchParams({ target: this.target.trim() });
    const url = `${this.apiBase}/api/scan?${queryParams.toString()}`;
    
    this.logs.push('[+] Routing to Domain Intelligence pipeline...');
    this.logs.push('[+] Establishing SSE stream for domain resolution...');
    
    this.progress = { completed: 0, total: 100, percentage: 0 };
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.addEventListener('progress', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.progress = parsed;
        this.logs.push(`[+] Progress: ${parsed.completed}/${parsed.total} subdomains resolved (${parsed.percentage}%).`);
      });
      
      this.eventSource.addEventListener('result', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        if (parsed.status === 'INFO') {
          this.logs.push(`[!] INFO: ${parsed.message}`);
        } else {
          this.resultBuffer.push(parsed);
          this.logs.push(`[✓] SUBDOMAIN: ${parsed.subdomain} -> ${parsed.ip} (Cloudflare: ${parsed.isCloudflare ? 'Yes' : 'No'})`);
        }
      });
      
      this.eventSource.addEventListener('end', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data);
        this.domainDossier = parsed.dossier;
        this.summary = { foundCount: parsed.dossier?.subdomains?.length || 0, timeTakenMs: Date.now() - (this.scanStartTime || 0) };
        this.isScanning = false;
        this.flushBuffers();
        this.logs.push(`[✓] Domain scan complete. Subdomains identified: ${parsed.dossier?.subdomains?.length || 0}`);
        
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      });
      
      this.eventSource.addEventListener('error', (e: Event) => {
        if (this.isScanning) {
          this.handleError('SSE stream connection error during domain resolution.');
        }
      });
    } catch (err: any) {
      this.handleError(err.message || 'Failed to initiate SSE connection.');
    }
  }

  private validateTarget(): 'EMAIL' | 'PHONE' | 'DOMAIN' | 'REAL_NAME' | 'USERNAME' | null {
    const raw = this.target.trim();
    if (!raw) return null;

    // 1. Email check
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (EMAIL_REGEX.test(raw)) return 'EMAIL';

    // 2. Phone check (E.164 or VN local numbers)
    const cleanPhone = raw.replace(/[\s\-\(\)\.]/g, '').replace('+', '');
    if (/^\d+$/.test(cleanPhone)) {
      const isE164 = (raw.startsWith('+') || raw.startsWith('00')) && cleanPhone.length >= 7 && cleanPhone.length <= 15;
      const isLocal = raw.startsWith('0') && raw.length >= 9 && raw.length <= 11;
      if (isE164 || isLocal) {
        return 'PHONE';
      }
    }

    // 3. Domain check
    const cleanDomain = raw.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
    const RECOGNIZED_TLDS = new Set(['com', 'org', 'net', 'edu', 'gov', 'vn', 'io', 'me', 'co', 'app', 'dev']);
    const parts = cleanDomain.split('.');
    if (parts.length >= 2 && RECOGNIZED_TLDS.has(parts[parts.length - 1])) {
      return 'DOMAIN';
    }

    // 4. Real Name check
    const nameWords = raw.split(/\s+/).filter(Boolean);
    if (nameWords.length >= 2 && nameWords.length <= 5) {
      const isName = nameWords.every(w => /^[a-zA-Z\u00C0-\u1EF9]+$/i.test(w));
      if (isName) return 'REAL_NAME';
    }

    return 'USERNAME';
  }
}
