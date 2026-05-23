# Task 27: Floating Graph Controls (Export, Fit, & Group Toggles)

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: HITL
- **Status**: [x] Completed
- **Blocked by**: Task 26
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Build a premium floating floating panel (`Graph Controls`) in the top-right corner of the Cytoscape canvas. Implement action buttons to trigger Cytoscape's `.fit()` view, `.layout()` reset, and file exports (`Export PNG` and `Export SVG` download bindings). Add a series of checkbox filters to toggle visibility of specific Node Groups dynamically (e.g. toggle IP nodes, Tracker nodes, or Documents).

## Acceptance criteria
- [x] Render a gorgeous glassmorphic controls toolbar overlaying the canvas with floating glass panels.
- [x] Connect the "Fit View" button to center and scale all active nodes in the viewport.
- [x] Implement local downloading of Cytoscape `.png()` and `.svg()` images.
- [x] Add checkbox selectors representing the 10 node types, dynamically adding/removing or hiding/showing elements on change without lag.
- [x] Verify the layout and export functionality with the user to guarantee maximum visual excellence.
