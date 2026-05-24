# classified-intelligence-manual
# 🕵️‍♂️ CLASSIFIED OSINT WORKBENCH: OPERATIONAL MANUAL

> **RESTRICTION LEVEL: CLASS-II OSINT OPERATIONS**
> This document details the technical operations, workflows, and features of the Polymorphic OSINT Intelligence Platform.

---

## 🗺️ Table of Contents
1. [🚀 Quick Start & Environment Configuration](#1-quick-start--environment-configuration)
2. [🔍 Target Analyzer & Classification Engine](#2-target-analyzer--classification-engine)
3. [👤 Username OSINT Engine (Polymorphic Crawler)](#3-username-osint-engine-polymorphic-crawler)
4. [📧 Email OSINT Engine & Classified Dossier Generator](#4-email-osint-engine--classified-dossier-generator)
5. [📞 Phone OSINT Engine & Social Synchronizer](#5-phone-osint-engine--social-synchronizer)
6. [🌐 Domain OSINT & Cytoscape Interactive Investigator Workbench](#6-domain-osint--cytoscape-interactive-investigator-workbench)
7. [🖥️ Real-Time SSE Log Console & Interface Localization](#7-real-time-sse-log-console--interface-localization)

---

## 1. 🚀 Quick Start & Environment Configuration

The platform operates on a **dual-stack system**: a modern Svelte-based glassmorphic frontend and a high-performance, Axios-free Node.js/TypeScript backend API.

### ⚙️ Environment Variables (`.env`)
To activate professional scanning features and premium rate limits, configure the `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Proxy Pools (Optional - For Evasion)
PROXY_POOL_URL=http://username:password@127.0.0.1:8080
TOR_PROXY_URL=socks5://127.0.0.1:9050

# API Authorization Tokens (To bypass Rate Limits - 5000 req/hr)
GITHUB_TOKEN=ghp_YourGitHubTokenHere
REDDIT_CLIENT_ID=YourRedditClientId
REDDIT_CLIENT_SECRET=YourRedditClientSecret

# High-Risk Evasion Session Cookies (Derived from real browser sessions)
FACEBOOK_COOKIE_KEY="c_user=...; xs=...;"
INSTAGRAM_COOKIE_KEY="sessionid=...;"
LINKEDIN_COOKIE_KEY="li_at=...;"
```

### 🛰️ Launching the Platform
Run the following commands in separate terminals to start the local intelligence services:

```bash
# Terminal 1: Launch Backend API Server
npm run server

# Terminal 2: Launch Frontend Svelte Client
npm run dev
```

Open your browser and navigate to `http://localhost:5173/` (or the port specified by Vite) to access the classified workbench dashboard.

---

## 2. 🔍 Target Analyzer & Classification Engine

The system features a **Zero-Clicks Target Classification Engine**. When you enter a target identifier in the primary search bar, the backend automatically analyzes and categorizes the input pattern without requiring manual selection.

### 💡 Input Parsing Rules
*   **Email Mode**: Matches standard email signatures (e.g., `analyst@nsa.gov`). Auto-triggers the Email OSINT suite.
*   **Phone Mode**: Matches international number patterns starting with `+` or digits containing 10-15 characters. Auto-triggers the Phone OSINT suite.
*   **Domain Mode**: Matches fully qualified domain names (FQDN) or IP addresses (e.g., `sec-ops.net`, `8.8.8.8`). Auto-triggers the Cytoscape Domain suite.
*   **Real Name Mode**: Matches inputs with space-separated capitalized strings (e.g., `John Doe`). Auto-triggers Identity Resolution.
*   **Username Mode**: Default fallback for standard alphanumeric strings. Triggers the polymorphic Username scan.

---

## 3. 👤 Username OSINT Engine (Polymorphic Crawler)

This module performs automated digital footprint mapping across **60+ global platforms** (GitHub, Reddit, Steam, Spotify, Facebook, Instagram, etc.).

### ⚙️ Under the Hood: Polymorphic Execution
The scanner utilizes three specialized engine tiers based on target platform signatures:
1.  **Tier 1: `apiEngine` (REST Direct)**: Queries unauthenticated public JSON APIs. Automatically injects `GITHUB_TOKEN` to prevent rate-limiting. Falls back to `htmlEngine` on WAF blockage.
2.  **Tier 2: `htmlEngine` (Axios-Free Fetch)**: Employs standard Node `fetch` and native `undici.ProxyAgent` for proxy routing. Uses a **simplified, clean header fingerprint** to bypass Cloudflare/AWS WAF detection (tested and verified live against Devpost).
3.  **Tier 3: `browserEngine` (Playwright Stealth)**: Launches a headless Chromium browser locally to render JS-heavy platforms. Automatically downgrades to static HTTP fetch in serverless environments (`process.env.VERCEL`) to stay within memory limits.

### 🚥 Concurrency Lane Control & Circuit Breakers
To avoid saturating local machine resources, scans are partitioned into four parallel lanes:
*   **API Lane (30 threads)**: Direct fast fetches.
*   **Standard HTML Lane (15 threads)**: Baseline scrapes.
*   **High-Risk HTML Lane (3 threads)**: Suspicious/guarded targets.
*   **Browser Lane (2 concurrent tabs)**: Strict Playwright context limits.
*   **Circuit Breaker**: Pauses scanning for 60 seconds if a platform registers **3 consecutive network failures**, protecting your proxy pool.

---

## 4. 📧 Email OSINT Engine & Classified Dossier Generator

The Email OSINT module gathers comprehensive metadata on target email addresses, resolving security breaches and digital footprints.

### 🛠️ Diagnostic Features
*   **SMTP & MX Audit**: Resolves active Mail Exchangers (MX) to verify domain deliverability.
*   **Disposable Mail Detector**: References database filters to identify temporary/burner addresses.
*   **MD5 & SHA-256 Hashing**: Auto-generates cryptographic hash values for direct threat intelligence matching.
*   **Breach Intelligence Lookup**: Checks the target address against known large-scale database breaches (HaveIBeenPwned & historical leak logs), returning breach name, date, compromised data classes (passwords, IP addresses, bios), and risk levels.
*   **Automated Email Permutator**: Generates up to **30+ probable email permutations** based on target first name, last name, and target domain for social engineering audits.

### 📄 Generation of Classified PDF Dossier
Click the **"Export PDF Dossier"** button to compile a beautifully structured, classified intelligence briefing using `pdfkit`. The output contains:
*   Official Agency Title & Metadata Header.
*   Classified watermark decoration.
*   Formatted target details and cryptographic hashes.
*   Comprehensive data breach history tables.
*   Exported digital footprint footprints.

---

## 5. 📞 Phone OSINT Engine & Social Synchronizer

This module decodes international telephone numbers and unmasks the subscriber's digital footprint.

### 🛠️ Diagnostic Features
*   **International Formatting**: Formats raw input into E.164, National, and International standards.
*   **Carrier & Geo-Location Lookup**: Identifies the mobile carrier, country of origin, registration timezone, and primary location coordinates.
*   **Multi-Source Social Synchronizer**: Scrapes and checks profiles associated with the phone number on high-risk platforms (WhatsApp, Telegram, Viber).
*   **Public Record Match (People Search)**: Connects to public database records to locate potential full names, home addresses, and relatives associated with the number.

---

## 6. 🌐 Domain OSINT & Cytoscape Interactive Investigator Workbench

The Domain Intelligence Engine maps complex network infrastructures and active port services.

### 🛠️ Diagnostic Features
*   **WHOIS & DNS Harvester**: Fetches domain owner information, registrar, creation/expiration dates, and queries records (A, AAAA, MX, NS, TXT).
*   **Dynamic Port Scanner**: Audits active service ports (HTTP, HTTPS, SSH, FTP, SMTP, RDP) using Shodan API queries with keyless local socket fallbacks.
*   **Cloudflare IP Checker**: Detects if the target IP belongs to Cloudflare subnets, indicating WAF shielding.
*   **Wildcard DNS Filter**: Automatically flags and filters out wildcard DNS responses to prevent false subdomain enumeration.

### 🎨 Cytoscape.js Investigator Workbench
The module generates a dynamic, highly responsive **Obsidian-style relational node graph**:

*   **Relational Mapping**: Displays the domain, subdomains, resolving IPs, MX servers, and open ports as colored interactive graph nodes.
*   **Graph Operations**:
    *   *Drag-and-Drop*: Manually rearrange nodes to trace infrastructure relationships.
    *   *Pan & Zoom*: Navigate complex sub-networks using mouse scroll or canvas controls.
    *   *Tab Persistence*: Toggle between Dossier/Graph views without resetting node layouts or active zoom levels.
*   **Data Export controls**:
    *   **Export JSON**: Downloads the structured graph dataset (nodes, edges, node attributes) for external analysis.
    *   **Export PNG Canvas**: Performs a high-definition pixel render of the interactive canvas, capturing the active node structure as a transparent image file for intelligence briefings.

---

## 7. 🖥️ Real-Time SSE Log Console & Interface Localization

The dashboard utilizes advanced UI elements to keep analysts informed and provides native multi-lingual support.

### 📡 Real-Time SSE Log Console
Located at the bottom of the interface, the glassmorphic terminal streams live telemetry directly from the server using Server-Sent Events (SSE):
*   Displays raw developer output, crawler connection handshakes, proxy changes, and active queue processing speeds.
*   **Copy Logs**: One-click clipboard export to easily attach execution traces to case files.

### 🇺🇸/🇻🇳 Bilingual Localization Toggle
Toggle translations instantly between **English (EN)** and **Vietnamese (VI)** via the navbar control. The entire translation dictionary in `translations.ts` dynamically localizes:
*   Status badges and risk levels (High, Medium, Low).
*   Console warnings and error details.
*   Graph node categories and export button labels.
*    classificatons and metadata fields.

---

> **Operational Directive**: Maintain active API tokens in `.env` and perform periodic `npm run test:live-audit` checks to ensure maximum engine evasion health.
