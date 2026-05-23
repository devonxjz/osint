# Task 28: Sliding Investigator Side Panel & Click-to-Investigate Quick Actions

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: HITL
- **Status**: [x] Completed
- **Blocked by**: Task 26
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Build a premium, slide-out details **Side Panel** that opens from the right/bottom when a Node on the Cytoscape graph is clicked. The entity details (Label, Group Icon, Source, Confidence, raw JSON) are displayed. Contextual **Quick Actions** based on Node type (e.g. click Email Node -> show "Scan Email Breach" button; click IP Node -> show "Reputation Check" button) are implemented, which pre-fill the search box and trigger instant scans.

## Acceptance criteria
- [x] Implement a sliding panel with glassmorphic styles (`backdrop-filter`) and smooth transitions.
- [x] Populates details when a Node click event is triggered, and hides the panel when the canvas background is clicked.
- [x] Render node attributes including confidence badges, discovery source, and raw expandable properties JSON.
- [x] Connect the "Quick Actions" table:
  - Email Node -> Quick trigger to `/api/scan-email?target=...`
  - Real Name Node -> Quick trigger to real name scan variants.
  - IP Node -> Quick trigger to IP reputation lookup.
  - Subdomain Node -> Deep scan target domain toggle.
- [x] Test the entire investigator workbench interaction loop to ensure smooth, responsive target lookup navigations.
