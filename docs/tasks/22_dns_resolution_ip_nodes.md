# Task 22: DNS Resolution & IP Mapping Engine

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: Task 20
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Wire sub-resolved IP checking into the graph generation. For every resolved subdomain, retrieve its IPv4 address, determine if it represents a Cloudflare proxy (using `isCloudflareIp`), create an **IP Node** (with the dynamic ASN / proxy properties), and draw a `RESOLVES_TO` edge connecting the subdomain to its resolved IP address.

## Acceptance criteria
- [x] For every discovered subdomain, parse and map its resolved IPv4 address to `graph.nodes`.
- [x] Flag IP nodes with `isCloudflare: true` if they belong to official Cloudflare IP ranges.
- [x] Create `RESOLVES_TO` edges connecting each subdomain/domain node to its respective IP node.
- [x] Stream found IP and subdomain nodes in real-time over the active SSE stream.
- [x] Add Jest tests checking wildcard filtering and Cloudflare CIDR range resolution of IP nodes.
