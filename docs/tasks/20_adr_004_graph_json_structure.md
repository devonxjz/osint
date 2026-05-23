# Task 20: ADR 004 & Graph JSON Structure Foundation

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: None
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Write the Architecture Decision Record (ADR 004) documenting the choice of a lightweight in-memory domain graph streamed over the existing SSE gateway `/api/scan` rather than a heavyweight stateful Spring Boot / Neo4j / RabbitMQ cluster. Then, initialize a placeholder `graph: { nodes: [], edges: [] }` in `resolveDomainIntel()` inside `backend/domainEngine.js` returning this structure at the end of the scan.

## Acceptance criteria
- [x] Create `docs/adr/004_lightweight_in_memory_domain_graph.md` outlining the context, decision, and consequences.
- [x] Define the TypeScript types for the Node (`id`, `label`, `type`, `group`, `properties`) and Edge (`source`, `target`, `relation`) in the backend/frontend logic.
- [x] Initialize the empty `graph` object in the default output returned by `resolveDomainIntel()` inside `backend/domainEngine.js`.
- [x] Verify that running `npm run check` compiles successfully without type or lint errors.
