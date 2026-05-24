Chuyển đổi toàn bộ dự án OSINT backend từ JavaScript sang TypeScript nhằm cải thiện khả năng maintain, type safety, scalability và giảm lỗi runtime trong quá trình phát triển.

---

## Objectives

* Chuyển source code `.js` sang `.ts` sử dụng cú pháp ES Modules (ESM) hiện đại
* Thiết lập TypeScript configuration chuẩn cho Node.js backend (biên dịch ra CommonJS để đảm bảo tính tương thích với Jest và Vercel)
* Cải thiện code structure và typing cho Dossier, Cache, và Registry
* Tăng khả năng mở rộng cho các module OSINT thu thập song song
* Chuẩn hóa coding style, cơ chế bảo mật biên giới (Edge Input Validation), bảo vệ tài nguyên chống leak (Abort Controller propagation), và build pipeline

---

## Scope

### Migration Includes

* API services & Express Routers
* Unified Scan Endpoint & SSE Controllers (bao gồm đầu ra SSE được Zod validate)
* Utility modules (`cache.js` bọc bởi chính sách LRU + TTL strict typing, `sseManager.js`, `analyzer.js`)
* OSINT collectors (Domain, Email, Phone, Name, Registry) với cơ chế truyền `AbortSignal` xuyên suốt
* Authentication & Authorization middleware
* Dossier Schemas, Cache entries, & Registry schemas (thay thế cho Database models do backend hoàn toàn stateless)
* Environment configuration & validation
* Unified Silent Abort & Error logging propagation

### Excludes

* Frontend migration (đã dùng TypeScript sẵn trên Svelte 5)
* Infrastructure changes
* Database migration (hệ thống stateless, không sử dụng Database vật lý)

---

## Tasks

### 1. Setup TypeScript Environment

* [ ] Install TypeScript & compiler dependencies (`typescript`, `@types/node`, `@types/express`)
* [ ] Configure `tsconfig.backend.json` (Target: `ES2022`, Module: `CommonJS` để giữ nguyên tương thích)
* [ ] Cài đặt `tsx` (TypeScript execute) và cấu hình `nodemon` để chạy dev-on-the-fly
* [ ] Setup path aliases (nếu cần)
* [ ] Configure ESLint + Prettier cho TypeScript

### 2. Convert Source Code

* [ ] Rename `.js` -> `.ts` trong thư mục `backend/`
* [ ] Add interfaces/types cho Registry và Cache (bắt buộc hỗ trợ các tùy chọn kích thước `maxSize` và `defaultTtlMs`)
* [ ] Fix implicit any issues bằng cách khai báo kiểu dữ liệu rõ ràng
* [ ] Convert CommonJS `require`/`module.exports` sang ES Modules `import`/`export` trong mã nguồn `.ts`
* [ ] Refactor utility functions

### 3. Backend Refactor & Validation Security

* [ ] Type hóa chặt chẽ API request/response bằng **Zod** tại Client boundaries để chống SQL/NoSQL Injection, Path Traversal, ReDoS, và XSS
* [ ] Thiết lập Zod Validation cho **chiều ra (outbound) của SSE Events** để ngăn chặn client EventSource nhận payload bị lỗi/không đúng schema
* [ ] Định nghĩa các flexible TypeScript Interfaces cho dữ liệu cào thô (scraped data) từ bên thứ ba (cho phép optional properties `?:` để giữ tính kiên cường - resilience)
* [ ] Khai báo kiểu dữ liệu chuẩn hóa cho SSE Event streams và Abortable options (`AbortableScanOptions`, `isAbortError`)
* [ ] Cấu hình truyền **`AbortSignal` bắt buộc xuyên suốt** từ Controller, qua các tầng Orchestrator/Collector và trực tiếp vào tùy chọn của `axios` để hủy tiến trình chạy ngầm khi client disconnect
* [ ] Type hóa các Dossier Model xuất ra (JSON Dossier & PDF buffer generator)

### 4. DevOps & CI/CD

* [ ] Cấu hình lệnh build backend: `"build:backend": "tsc -p tsconfig.backend.json"`
* [ ] Cập nhật build script tổng: `"build": "vite build && npm run build:backend"`
* [ ] Cập nhật file gateway `api/index.js` để tự động load từ code đã build: `const app = require('../dist-backend/index.js')`
* [ ] Update Docker configuration & GitHub Actions pipeline
* [ ] Verify Vercel serverless function deployment

### 5. Testing

* [ ] Fix & chuyển đổi unit tests sang TypeScript hoặc giữ test dạng JS chạy trực tiếp qua Jest
* [ ] Verify API compatibility bằng các cuộc scan thử nghiệm thực tế
* [ ] Test OSINT collectors dưới nhiều kịch bản (success, slow rate-limiting, and client abort)
* [ ] Validate environment configs

---

## Expected Benefits

* Trải nghiệm phát triển (Developer Experience) vượt trội nhờ `tsx` và autocomplete của IDE
* Type safety cực kỳ mạnh mẽ cho cấu trúc Dossier, SSE Events và Cache
* Bảo vệ hệ thống khỏi các lỗ hổng input-level ở tầng biên giới API Express
* Tránh rò rỉ tài nguyên hệ thống (CPU/Memory/API call cost) khi client disconnect nhờ Abort propagation toàn diện
* Chống tràn bộ nhớ cache in-memory nhờ chính sách LRU + TTL được type-check chặt chẽ
* Giữ nguyên tính kiên cường (resilience) của scrapers trước sự thay đổi cấu trúc của các web bên thứ ba
* Giảm lỗi runtime và dễ dàng tích hợp thêm các Collector mới trong tương lai

---

## Potential Issues

* Sự thay đổi cấu trúc dữ liệu thô của bên thứ ba (đã giải quyết bằng cách dùng Flexible TS Interfaces thay vì Zod strict parsing cho scraped data)
* ESM/CommonJS compatibility (đã giải quyết bằng chiến lược "Write ESM, Compile CommonJS")
* Cấu hình Jest chạy tích hợp kiểm thử

---

## Suggested Tech Stack

* Node.js & Express
* TypeScript
* ESLint & Prettier
* `tsx` (TypeScript Execute) & `nodemon` cho Local Dev
* `tsc` cho Production Build
* **Zod** cho Edge Input Validation (Inbound) và Event Format Validation (Outbound SSE)

---

## Priority

High

## Estimated Time

5 - 10 days
