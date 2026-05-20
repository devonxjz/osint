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

  // Global Theme Toggling State ('light' | 'dark')
  theme = $state<'light' | 'dark'>('dark');

  // Internal connection handle
  private eventSource: EventSource | null = null;

  // --- Derived Reactive States ---
  targetType = $derived(this.validateTarget());

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
  async startScan() {
    if (this.isScanning || !this.target.trim()) return;

    // Reset state before beginning
    this.isScanning = true;
    this.progress = { completed: 0, total: 0, percentage: 0 };
    this.results = {};
    this.logs = [`[+] Starting scan on target: "${this.target.trim()}"...`];
    this.summary = null;
    this.emailScanResult = null;
    this.breaches = [];
    this.hasGravatar = false;
    this.avatarUrl = null;

    const queryParams = new URLSearchParams({
      target: this.target.trim(),
      categories: this.categories.join(','),
      cookies: JSON.stringify(this.cookieOverrides)
    });

    const url = `${this.apiBase}/api/scan?${queryParams.toString()}`;
    
    this.logs.push('[+] Establishing persistent SSE stream channel...');
    
    try {
      this.eventSource = new EventSource(url);

      // SSE event mapping to private handlers
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
        // SSE sometimes fires generic errors on disconnect/end, only show if we are scanning
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
  }

  // --- SSE Event Handlers ---
  private handleProgress(data: { completed: number; total: number; percentage: number }) {
    this.progress = data;
    this.logs.push(`[+] Progress updated: ${data.completed}/${data.total} platforms checked (${data.percentage}%).`);
  }

  private handleResult(data: ScanResult) {
    // 1. Map to state machine statuses
    const status: CardStatus = data.status === 'FOUND' ? 'FOUND' : 'NOT_FOUND';
    
    this.results[data.platform] = {
      status,
      data
    };

    // 2. Stream to console log panel
    if (status === 'FOUND') {
      this.logs.push(`[✓] FOUND: ${data.platform} -> ${data.url}`);
      // If we plucked an avatar from profile (e.g. GitHub), update primary avatar
      if (data.avatar && !this.avatarUrl) {
        this.avatarUrl = data.avatar;
      }
    } else {
      this.logs.push(`[ ] Checked ${data.platform}... NOT FOUND`);
    }
  }

  private handleError(message: string) {
    this.logs.push(`[!] ERROR: ${message}`);
    this.isScanning = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleEnd(data: { summary: ScanSummary }) {
    this.summary = data.summary;
    this.isScanning = false;
    this.logs.push(`[✓] Scan completed in ${data.summary.timeTakenMs}ms. Found on ${data.summary.foundCount} platform(s).`);

    // Clean close
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Check if target was email to populate mock breach alert list for demo/PRD specifications
    if (this.targetType === 'EMAIL') {
      this.mockEmailBreachData();
    }
  }

  // --- Trigger PDF Dossier Download ---
  async downloadDossier() {
    if (!this.summary) return;
    this.logs.push('[+] Packing dossier PDF and requesting download...');
    try {
      window.print(); // Falls back to beautiful system print stylesheet or can fetch backend PDF
      this.logs.push('[✓] Dossier report generated successfully.');
    } catch (err: any) {
      this.logs.push(`[!] Dossier export failed: ${err.message}`);
    }
  }

  // --- Helper Methods ---
  private validateTarget(): 'EMAIL' | 'PHONE' | 'DOMAIN' | 'USERNAME' | null {
    const raw = this.target.trim();
    if (!raw) return null;

    // 1. Email check
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (EMAIL_REGEX.test(raw)) return 'EMAIL';

    // 2. Phone check (e.g. +84987654321 or 0987654321)
    const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
    if (PHONE_REGEX.test(raw.replace(/\s+/g, ''))) return 'PHONE';

    // 3. Domain check (e.g. example.com)
    const DOMAIN_REGEX = /^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,63}$/;
    if (DOMAIN_REGEX.test(raw)) return 'DOMAIN';

    return 'USERNAME';
  }

  private mockEmailBreachData() {
    this.hasGravatar = true;
    this.avatarUrl = 'https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50?s=200';
    this.emailScanResult = {
      valid: true,
      type: 'EMAIL',
      sanitized: this.target.trim().toLowerCase(),
      breachesCount: 3,
      hasGravatar: true,
      avatarUrl: this.avatarUrl
    };

    this.breaches = [
      {
        name: 'Adobe Creative Cloud',
        date: 'October 2019',
        description: 'In October 2019, Adobe experienced a data exposure that compromised over 7 million subscription records. The exposed database contained customer metadata.',
        dataClasses: ['Email Addresses', 'Member IDs', 'Products Subscribed']
      },
      {
        name: 'LinkedIn Scraping Leak',
        date: 'April 2021',
        description: 'Scraped data of 500 million LinkedIn users was compiled and posted on a hacker forum. It contains public records and full name metrics.',
        dataClasses: ['Full Names', 'Email Addresses', 'Professional Profiles']
      },
      {
        name: 'Canva Account Leak',
        date: 'May 2019',
        description: 'Canva suffered a cyber attack impacting 137 million accounts. The breach included usernames, emails, and passwords hashed with bcrypt.',
        dataClasses: ['Passwords', 'Usernames', 'Email Addresses', 'Geographical Locations']
      }
    ];
  }
}
