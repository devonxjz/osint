# PRD: Module 6 - Dossier Generator

## Problem Statement
After completing a digital footprint investigation, analysts, educators, and security students need to export their findings into a structured, formal, and authoritative report. Generating custom HTML reports is hard to print, and standard PDFs look generic and unpolished.

## Solution
Create a PDF builder engine using `pdfkit` that runs completely in-memory, takes a completed scan results payload, and formats it into a highly premium, clean, top-secret-styled classified investigation document written directly to the HTTP output stream.

## User Stories

1. As an investigator, I want to download a PDF report, so that I can document digital footprint findings in physical archives.
2. As a user, I want the PDF design to have a professional classified look (military red headers, dark grid dividers, target avatar pictures, structural data tables), so that it matches an authentic dossier feel.
3. As a developer, I want the PDF to compile in-memory and stream directly to the response, so that the server does not accumulate temp files.

## Implementation Decisions

### Interface Specification
```javascript
async function generateDossierPDF(reportData, writeStream)
```
*   **`reportData` Shape**:
    ```typescript
    interface DossierPayload {
      username: string;
      scanType: 'USERNAME' | 'EMAIL';
      timestamp: string;
      foundPlatforms: Array<{
        name: string;
        url: string;
        bio?: string;
        avatar?: string;
      }>;
      breaches?: Array<{
        name: string;
        domain: string;
        compromisedData: string[];
      }>;
    }
    ```

### PDF Kit Styling Tokens
*   **Fonts**: Standard fallback fonts (Helvetica-Bold for titles, Courier for technical keys, Helvetica for descriptive text).
*   **Colors**:
    *   Primary: Deep Charcoal (`#1F2937`)
    *   Accent: Alert Crimson (`#DC2626`)
    *   Text: Slate (`#4B5563`)
*   **Layout Elements**:
    *   Header: "TOP SECRET - CLASSIFIED INVESTIGATION DOSSIER" block.
    *   System info block (Time of scan, Target name, total positive traces).
    *   Image slot: Renders target avatar if available.
    *   Main table: Two-column layout mapping `Platform Name` and active `URL` link.

## Testing Decisions
*   **Stream Closure**: Ensure `pdfkit` fires the `.end()` call reliably so the stream terminates and client receives complete binary headers.
*   **Crash Evasion**: Implement generic try-catch blocks during image rendering. If a target avatar URL is dead or invalid, draw a placeholder SVG/rect instead of crashing the PDF compilation process.

## Out of Scope
*   **Interactive PDFs**: Embedded charts or forms inside the generated PDF.
*   **Password Protected Documents**: Encrypting PDF payloads.

## Further Notes
*   This module is synchronous-bound PDF generation, but uses streaming output pipelines.
