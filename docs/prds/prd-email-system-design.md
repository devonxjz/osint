# Email OSINT Intelligence System — Thiết Kế Hệ Thống Chi Tiết

> Tài liệu thiết kế hệ thống phân tích dấu vết kỹ thuật số từ địa chỉ email mục tiêu.
> Phiên bản: 1.0 | Phân loại: Internal / Lab Use Only

---

## 1. Tổng Quan Kiến Trúc

Hệ thống nhận một **địa chỉ email** làm đầu vào và thực hiện song song nhiều pipeline thu thập thông tin tình báo (OSINT), bao gồm: trích xuất username, tra cứu mạng xã hội, kiểm tra cơ sở dữ liệu bị xâm phạm, và xác minh danh tính thực.

```
EMAIL INPUT
    │
    ├─── [Pipeline A] Username Extraction + Social Recon
    ├─── [Pipeline B] Breach & Compromised DB Lookup
    ├─── [Pipeline C] Identity Resolution (Real Name / Employer)
    └─── [Pipeline D] Reverse Email + Profile Discovery
                    │
                    ▼
            CONSOLIDATED DOSSIER
```

---

## 2. Module Chi Tiết

### Module 1 — Input Validation & Address Verification

**Mục đích**: Kiểm tra tính hợp lệ và tồn tại của địa chỉ email trước khi kích hoạt các pipeline downstream.

| Thành phần | Công cụ / API | Mô tả |
|---|---|---|
| Syntax Validator | Regex RFC 5322 | Kiểm tra định dạng email hợp lệ |
| Domain MX Check | DNS Lookup | Xác minh domain có mail server hay không |
| Address Verifier | Hunter.io API | Xác nhận email có tồn tại trên domain đó |
| Permutation Generator | Nội bộ | Tạo biến thể email (work/personal) để mở rộng tìm kiếm |

**Output schema**:
```typescript
interface VerificationResult {
  email: string;
  syntaxValid: boolean;
  domainExists: boolean;
  hunterScore: number | null;    // 0-100, độ tin cậy Hunter.io
  isDisposable: boolean;
  suggestedPermutations: string[];
}
```

**Lưu ý triển khai**:
- Hunter.io API có giới hạn 25 requests/tháng (free tier). Implement cache layer bằng in-memory Map với TTL 24h.
- Với email dạng `work`, thử thêm các pattern: `firstname.lastname@domain`, `f.lastname@domain`, `firstname@domain`.

---

### Module 2 — Username Extraction & Cross-Platform Search

**Mục đích**: Trích xuất username tiềm năng từ phần local của email và tìm kiếm tài khoản liên quan trên 40+ nền tảng.

#### 2.1 Username Extraction Logic

```
mikeb55@yahoo.com
    │
    ├── Strip domain  → "mikeb55"
    ├── Variants      → ["mike_b55", "mikeb", "mike.b55", "mikeb_55"]
    └── Clean @prefix → remove leading "@" if present
```

**Parsing rules**:
- Tách chuỗi trước `@`, loại bỏ số đuôi để tạo biến thể
- Thay thế dấu `.` và `_` tương ứng nhau
- Tạo tối đa 5 biến thể để tránh false positive flooding

#### 2.2 Platform Search Registry

| Category | Platforms |
|---|---|
| **Tech** | GitHub, GitLab, NPM, DockerHub, HackerNews, LeetCode, CodePen |
| **Social** | Reddit, Medium, Linktree, BuyMeACoffee, About.me |
| **Gaming** | Steam, Chess.com, Lichess, Twitch |
| **Media** | Spotify, SoundCloud, Flickr, DeviantArt, Behance |

**Chunked execution strategy** (tránh rate-limit):
```
[Batch 1: 15 platforms] → delay 100ms
[Batch 2: 15 platforms] → delay 100ms
[Batch 3: 15 platforms] → delay 100ms
...
```

**Output per platform**:
```typescript
interface PlatformResult {
  platform: string;
  username: string;
  status: 'FOUND' | 'NOT_FOUND' | 'ERROR';
  profileUrl: string;
  bio?: string;
  avatar?: string;
  location?: string;
}
```

---

### Module 3 — Breach & Compromised Database Lookup

**Mục đích**: Kiểm tra email có xuất hiện trong các vụ rò rỉ dữ liệu đã biết không.

#### 3.1 Engine Ưu Tiên

```
IF apiKey present:
    → HIBP Live API (hibp-integration.k8s.io/v3/breachedaccount/{email})
ELSE:
    → Mock Breach Database (local simulation)
```

#### 3.2 HaveIBeenPwned (HIBP) Integration

- **Endpoint**: `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}`
- **Header**: `hibp-api-key: {user_key}`
- **Rate limit**: 1 request/1500ms (enforce với sleep queue)

**Breach object schema**:
```typescript
interface Breach {
  name: string;         // "Adobe"
  domain: string;       // "adobe.com"
  breachDate: string;   // "2013-10-04"
  pwnCount: number;     // 153,000,000
  compromisedData: string[]; // ["Email", "Passwords", "Usernames"]
  description: string;  // HTML description
  isSensitive: boolean;
  isVerified: boolean;
}
```

#### 3.3 Mock Breach Database (Fallback)

Cơ sở dữ liệu giả lập cho môi trường học thuật, không cần API key:

| Trigger Pattern | Simulated Breaches Returned |
|---|---|
| `*@gmail.com` | LinkedIn 2012, Adobe 2013 |
| `*@yahoo.com` | Yahoo 2013 (3B accounts), Zing ID 2018 |
| `test@*` | Canva 2019, MyFitnessPal 2018 |
| `admin@*` | RockYou 2009, Collection #1 2019 |
| (default) | Randomly sample 2 từ pool 20 breaches |

---

### Module 4 — Gravatar & Avatar Intelligence

**Mục đích**: Tra cứu ảnh đại diện công khai liên kết với email thông qua Gravatar.

#### 4.1 Gravatar Lookup Flow

```
email → lowercase → MD5 hash → Gravatar API request
                                        │
                        ┌───────────────┴──────────────┐
                        │ 200 OK                        │ 404
                        │ Avatar URL exists             │ No Gravatar profile
                        ▼                               ▼
                  Extract profile JSON             hasGravatar: false
                  (avatar, displayName,
                   aboutMe, currentLocation)
```

**Endpoint**: `https://www.gravatar.com/avatar/{md5hash}?d=404`

**MD5 normalization rule**: Email phải được `trim()` + `toLowerCase()` trước khi hash.

```javascript
const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
```

#### 4.2 Extended Profile Endpoint

```
GET https://www.gravatar.com/{md5hash}.json
```

Trả về: `preferredUsername`, `displayName`, `aboutMe`, `currentLocation`, `urls[]` (links tới các tài khoản khác).

---

### Module 5 — Identity Resolution Engine

**Mục đích**: Ánh xạ email sang danh tính thực: họ tên, nơi làm việc, thông tin công khai.

#### 5.1 Sources Tích Hợp

| Source | Loại | Dữ liệu Thu Được | Ghi chú |
|---|---|---|---|
| **Hunter.io** | API (free tier) | Real Name, Employer, Position | 25 req/tháng |
| **PIPL API** | Paid API | Full identity graph | Tốn phí, cho production |
| **Document Search** | Web scraping | Mentions trong docs công khai | Google dorks |
| **Facebook by Email** | Graph API | Name, Profile (nếu public) | Cần App Review |
| **IntelTechniques Email Tool** | Web | Aggregated lookup | Wrapper tổng hợp |

#### 5.2 Waterfall Resolution Strategy

```
Step 1: Hunter.io (free, nhanh)
    → IF confident (score > 70): return result
    → ELSE: continue

Step 2: Gravatar profile JSON
    → IF displayName found: extract as candidate name
    → ELSE: continue

Step 3: Google Dork search
    → Query: "\"email@domain.com\" site:linkedin.com OR site:xing.com"
    → Parse top 3 results với Cheerio

Step 4: PIPL API (optional, paid)
    → Full identity resolution (production only)
```

**Output**:
```typescript
interface IdentityResult {
  realName: string | null;
  employer: string | null;
  position: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
}
```

---

### Module 6 — Reverse Email & Social Discovery

**Mục đích**: Tìm kiếm ngược từ email sang các hồ sơ mạng xã hội và website cá nhân.

#### 6.1 Tools & APIs

| Tool | Phương pháp | Output |
|---|---|---|
| **Pipl** | Reverse email lookup | Social profiles, addresses |
| **That's Them** | People search | Name, location, relatives |
| **ReverseMails** | Email → social | LinkedIn, Facebook, Twitter |
| **DomainData** | WHOIS reverse | Domains registered với email |
| **Newsgroups** | Archive search | Usenet posts, old forum mentions |

#### 6.2 Google Dorking Queries

```
"target@email.com"                           → trực tiếp
"target@email.com" -site:haveibeenpwned.com  → loại breach sites
site:linkedin.com "target@email.com"         → LinkedIn
site:github.com "target@email.com"           → GitHub commits
"target@email.com" filetype:pdf              → documents
```

---

### Module 7 — Email Assumption & Permutation Engine

**Mục đích**: Từ thông tin thu được (tên thật, domain công ty), tạo ra và xác minh các email giả định khác.

#### 7.1 Work Email Pattern Generator

```
Input: realName="Mike Brown", domain="company.com"

Generated Candidates:
  mike.brown@company.com
  m.brown@company.com
  mbrown@company.com
  mike@company.com
  mike_b@company.com
  brownm@company.com
```

#### 7.2 Personal Email Pattern Generator

```
Input: username="mikeb55"

Gmail candidates:   mikeb55@gmail.com, mike.b55@gmail.com
Yahoo candidates:   mikeb55@yahoo.com
Hotmail candidates: mikeb55@hotmail.com, mikeb55@outlook.com
```

#### 7.3 Verification Flow

Mỗi email candidate được đưa qua:
1. MX record check
2. Hunter.io verify (nếu còn quota)
3. SMTP ping (tùy chọn, out-of-scope mặc định)

---

### Module 8 — Facebook Profile Discovery

**Mục đích**: Tìm profile Facebook liên kết với email mục tiêu.

#### 8.1 Các Phương Pháp

| Phương pháp | Cách thực hiện | Rủi ro |
|---|---|---|
| **FB Password Reset** | Nhập email vào form reset → check nếu FB confirm account | FB có thể block IP sau vài lần thử |
| **FB Graph Search** | Dùng Graph API với permission `email` | Cần user token, bị hạn chế từ 2019 |
| **Web Scraping** | Search `facebook.com/search?q={email}` | Bị Cloudflare block nhanh |

**Lưu ý đạo đức & pháp lý**:
> ⚠️ Phương pháp FB Password Reset được dùng trong lab/học thuật để hiểu vector tấn công. **Không triển khai trong production** mà không có sự đồng ý từ chủ tài khoản.

**Implementation cho lab**:
```javascript
// Chỉ mô phỏng — không gửi request thật đến Facebook
async function simulateFBPasswordReset(email) {
  // Mock: Trả về kết quả giả định cho mục đích giáo dục
  return {
    accountFound: mockFBDatabase.has(email),
    maskedPhone: accountFound ? "+1 ***-***-4521" : null
  };
}
```

---

## 3. Luồng Dữ Liệu Tổng Thể

```
                    ┌─────────────────┐
                    │  EMAIL ADDRESS  │
                    │  Input & Verify │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌────────────────┐
      │  Username    │ │  Breach  │ │   Gravatar /   │
      │  Extraction  │ │  Lookup  │ │   Avatar Check │
      │  + Platform  │ │ HIBP/Mock│ │   MD5 Hash     │
      │  Search      │ └────┬─────┘ └───────┬────────┘
      └──────┬───────┘      │               │
             │              │               │
             ▼              ▼               ▼
      ┌──────────────────────────────────────────────┐
      │              Identity Resolution             │
      │   Hunter.io → Pipl → IntelTechniques → Dorks │
      └──────────────────────┬───────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌────────────────┐
      │  Social Nets │ │  Email   │ │    Facebook    │
      │  Discovery   │ │Permutat. │ │    Profile     │
      │  (Pipl,etc.) │ │+Verify   │ │    Lookup      │
      └──────┬───────┘ └────┬─────┘ └───────┬────────┘
             │              │               │
             └──────────────┴───────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  SSE Stream →    │
                   │  React Dashboard │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  PDF Dossier     │
                   │  Generator       │
                   └──────────────────┘
```

---

## 4. SSE Event Stream Contract

Tất cả modules gửi kết quả qua SSE theo chuẩn:

```
event: result
data: {"module":"breach","status":"FOUND","data":{...}}

event: result
data: {"module":"gravatar","status":"FOUND","avatarUrl":"https://..."}

event: progress
data: {"completed":12,"total":45,"percentage":26.7,"currentPlatform":"GitHub"}

event: end
data: {"summary":{"totalFound":8,"breachCount":3,"timeTakenMs":18420}}
```

---

## 5. PDF Dossier — Cấu Trúc

```
PAGE 1: COVER
  ┌─────────────────────────────────┐
  │  ████ TOP SECRET ████           │
  │  CLASSIFIED INVESTIGATION       │
  │  DIGITAL FOOTPRINT ANALYSIS     │
  │  Target: mike***@yahoo.com      │
  │  Date: 2024-01-15 09:42:17 UTC  │
  └─────────────────────────────────┘

PAGE 2: SUBJECT PROFILE
  - Avatar (Gravatar if found)
  - Real Name (if resolved)
  - Employer / Position
  - Confidence Score
  - Breach Summary (count, severity)

PAGE 3: PLATFORM FINDINGS TABLE
  Platform | Status | URL | Notes

PAGE 4: BREACH DETAILS
  Per breach: Name, Date, Compromised Data, Description

PAGE 5: APPENDIX
  - Raw usernames checked
  - Email permutations tested
  - Scan methodology notes
```

---

## 6. Threat Model & Ethical Constraints

| Rủi ro | Biện pháp giảm thiểu |
|---|---|
| Rate limiting / IP block | Chunk execution (batch 15), delay 100ms, rotate User-Agents |
| False positives | Per-platform `checkType` validation (status / text / selector) |
| API key exposure | Keys chỉ truyền qua query param nội bộ, không log |
| Over-collection | Chỉ thu dữ liệu **công khai**, không authenticated session |
| GDPR compliance | Không lưu kết quả vào DB; dữ liệu chỉ tồn tại trong RAM của session |

---

## 7. Technology Stack

| Layer | Technology | Lý do chọn |
|---|---|---|
| Backend | Node.js + Express | Non-blocking I/O tốt cho concurrent HTTP requests |
| HTTP Client | Axios | `validateStatus: () => true` để không crash khi 404 |
| HTML Parsing | Cheerio | jQuery-like selector, lightweight, không cần headless browser |
| PDF Generation | PDFKit | Streaming output, không cần temp files |
| Frontend | React + Vite | Fast HMR, SPA architecture |
| Realtime | Server-Sent Events | Đơn giản hơn WebSocket cho unidirectional stream |
| Hashing | Node crypto (built-in) | MD5 cho Gravatar lookup |

---

## 8. Testing Strategy

| Module | Test Type | Scenario Quan Trọng |
|---|---|---|
| Input Validator | Unit | `@mikeb55` → sanitize thành `mikeb55` |
| MD5 Hasher | Unit | `Test.Email@Gmail.com` → `b7f0e6e737cc57b855581f185c7b3992` |
| Breach Engine | Unit | No API key → mock DB triggered |
| Platform Scanner | Integration (mocked) | Simulate 200/404/500, verify chunking delay |
| SSE Manager | Integration | `req.on('close')` stops chunk loops |
| PDF Generator | Integration | Stream closes properly, avatar 404 không crash |

---

*Tài liệu thiết kế nội bộ — Chỉ dùng cho mục đích nghiên cứu và học thuật.*