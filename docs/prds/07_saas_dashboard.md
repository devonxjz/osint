# PRD: Module 7 - SaaS Dashboard UI

## Problem Statement
A system like OSINT is only as good as its user interface. Command-line outputs are difficult for non-technical users to digest, and poorly-structured web dashboards feel cheap and fail to build user trust.

## Solution
Create an extremely premium, high-fidelity single page application (SPA) in React (Vite) styled in a sleek, modern, Vercel-style SaaS interface. It integrates a real-time terminal logging console, beautiful status grids, light/dark mode toggling, and interactive data cards.

## User Stories

1. As a user, I want a beautiful, uncluttered search dashboard, so that I can easily key in a username or email.
2. As a night-time analyst, I want to toggle between light and dark modes, so that the screen is readable in all environments.
3. As a user, I want a visual progress ring and live logs, so that I understand exactly what the backend scanner is doing at all times.
4. As a researcher, I want to click a card to open a found profile link directly, so that I can manually verify findings.

## Implementation Decisions

### Design Style (SaaS Aesthetic)
*   **Palette**: Pure White (`#FFFFFF`) / Slate Grey (`#F9FAFB`) in light mode; Deep Obsidian (`#0D0D12`) / Dark Slate (`#18181B`) in dark mode.
*   **Typography**: Inter or Geist (sleek, high-readability modern fonts).
*   **Shadows**: Elegant, soft multi-layer box-shadows.

### Core React Components
1.  **`<SearchBar />`**:
    *   Dynamic validation showing icon changing from `@` (Email) to `👤` (Username) based on live input string analysis.
    *   Configurable platform category checkboxes (Tech, Gaming, Social, Media).
2.  **`<PlatformGrid />`**:
    *   Displays 40+ platform cards.
    *   State color tags: `PENDING` (dashed border), `SCANNING` (animated blue pulse), `FOUND` (emerald green badge + clickable hyperlink), `NOT_FOUND` (faint muted grey).
3.  **`<LogStreamer />`**:
    *   A miniature, sleek, dark-slate console panel streaming backend raw logs (e.g. `[+] Scanning GitHub... FOUND`, `[+] Checking Spotify... NOT FOUND`) with automatic scroll-to-bottom behavior.
4.  **`<BreachCard />`**:
    *   Highlights found email breaches in a list showing breach date, site name, and red warning borders detailing compromised data lists.
5.  **`<DossierExport />`**:
    *   Displays a beautiful "Dossier Ready" card showing target summary statistics (Active profiles, location, avatar preview) and a primary download CTA button triggering the backend PDF.

## Testing Decisions
*   **Component State Test**: Verify the progress indicator transitions smoothly from 0% to 100% as events stream in.
*   **EventSource Handling**: Test clean socket closing when a user hits "Cancel" mid-scan.

## Out of Scope
*   **User Login/Auth**: Saving user profile credentials (entire site is open to use).
*   **Multi-target Scanning**: Running scans on multiple targets simultaneously on the same client dashboard tab.

## Further Notes
*   This UI is a standard Single Page Application communicating with the backend Express SSE server.
