# Telephone OSINT Intelligence System — Thiết Kế Hệ Thống Chi Tiết

> Tài liệu thiết kế hệ thống phân tích dấu vết kỹ thuật số từ số điện thoại mục tiêu.
> Phiên bản: 1.0 | Phân loại: Internal / Lab Use Only

---

## 1. Tổng Quan Kiến Trúc

Hệ thống nhận một **số điện thoại** làm đầu vào (dưới định dạng E.164 hoặc số nội địa tự động chuẩn hóa) và thực hiện song song nhiều pipeline thu thập thông tin tình báo (OSINT), bao gồm: tra cứu thông tin nhà mạng/vị trí, truy quét mạng xã hội trực tiếp, truy vấn ngược danh bạ từ các API viễn thông/danh bạ toàn cầu, giả lập đồng bộ danh bạ ứng dụng OTT (di động), và khai thác dữ liệu từ các nhà bán thông tin (Data Brokers) kết hợp Google Custom Dorking.

```
                  ┌───────────────────────┐
                  │    TELEPHONE INPUT    │
                  │ (E.164 or Normalised) │
                  └───────────┬───────────┘
                              │
               ┌──────────────┼──────────────┬──────────────┐
               │              │              │              │
               ▼              ▼              ▼              ▼
         [Pipeline A]   [Pipeline B]   [Pipeline C]   [Pipeline D]
          Facebook        Reverse      Mobile Sync    Data Brokers
          Discovery        Lookup      (Emulator)      & Dorking
               │              │              │              │
               └──────────────┼──────────────┼──────────────┘
                              │
                              ▼
                     CONSOLIDATED DOSSIER
```

---

## 2. Module Chi Tiết

### Module 1 — Input Validation & Carrier Lookup
- **Chức năng:** Nhận số điện thoại đầu vào, tự động chuẩn hóa về định dạng chuẩn quốc tế E.164 (ví dụ: `+84987654321` cho Việt Nam, `+12025550143` cho Mỹ). Kiểm tra mã quốc gia và thực hiện phân tích nhà mạng (Carrier) bằng cách đối chiếu dải số hoặc sử dụng cơ sở dữ liệu viễn thông nội bộ.
- **Đầu ra:** `{ valid: boolean, formatted: string, countryCode: string, carrier: string }`.
- **Cơ chế hoạt động:** Đóng vai trò làm cổng bảo vệ (Gate) cho toàn bộ quy trình. Nếu định dạng số không hợp lệ, hệ thống sẽ dừng scan ngay lập tức để tối ưu tài nguyên.
- **Auto-Correction Edge Case:** Hệ thống tự động sửa lỗi gõ sai phổ biến khi người dùng nhập cả mã quốc gia kèm số `0` ở đầu (ví dụ: `+840987654321` hoặc `840987654321` sẽ tự động loại bỏ số `0` ở giữa để chuẩn hóa thành `+84987654321`).

### Module 2 — Facebook Discovery (Direct Social Search)
- **Chức năng:** Tận dụng khả năng liên kết trang/bài viết của Facebook để tìm kiếm thông tin về chủ sở hữu.
- **Quy trình:**
  - Nhập số điện thoại vào thanh tìm kiếm qua session/cookie (giả lập hoặc quét CSDL công khai).
  - Quét xem số điện thoại có xuất hiện trong các Fanpage hoặc bài đăng công khai (Facebook Posts).
- **Đầu ra:** Các liên kết mạng xã hội liên quan (`Social Networks`) và Tên thật ứng viên (`Candidate Real Name`).

### Module 3 — Reverse Lookup Engine
- **Chức năng:** Truy tìm danh tính thật và thông tin vị trí của chủ thuê bao thông qua các API viễn thông và cơ sở dữ liệu danh bạ toàn cầu.
- **3 Phân luồng nhỏ:**
  1. **API Phân giải (Caller ID APIs):** Gọi trực tiếp tới các dịch vụ Caller ID chuyên nghiệp như `NextCaller`, `OpenCNAM`, `CallerIDService`.
  2. **Web Tra Cứu (Reverse Search Websites):** Truy vấn tự động/cào thông tin từ các trang web tra cứu danh bạ lớn như `Nuwber`, `CallerIDTest`.
  3. **Web Định Danh (Caller ID Websites):** Tra cứu chéo qua cơ sở dữ liệu của `Twilio`, `WhoCalld`, `PrivacyStar`.
- **Đầu ra:** `{ realName: string, location: string, carrier: string, sources: string[] }`.
- **Twilio VN Fallback Rule:** Do API Twilio Lookup v2 thường trả về `callerName: null` đối với các số thuê bao nằm ngoài khu vực US/CA (như Việt Nam), hệ thống sẽ chủ động bắt trường hợp này để fallback sang tên được sinh ngẫu nhiên nhưng nhất quán theo cơ chế **Deterministic Seed-Based Mocking**, thay vì trả về chuỗi rỗng.

### Module 4 — Simulated OTT Profile Lookup (Mock-only for Lab/Demo)
- **Chức năng:** Giả lập hồ sơ đồng bộ danh bạ trên OTT để trích xuất hồ sơ liên kết trong môi trường Lab.
- **Lưu ý Quan trọng về Scope:** Do các rào cản mã hóa đầu cuối (E2E) và chính sách bảo mật khắt khe của các nhà mạng/ứng dụng OTT di động (Telegram, Zalo, WhatsApp, Viber, Snapchat), module này **hoàn toàn chạy giả lập dữ liệu tĩnh (mock-only)** dựa trên mã băm của số điện thoại dưới sandbox, KHÔNG thực hiện kết nối/giả lập emulator hoặc gửi gói tin thật lên API OTT để tránh rủi ro bảo mật và bị block IP.
- **Kỹ thuật mô phỏng trong Lab:**
  - Số điện thoại được giả định thêm vào danh bạ ảo (`Contacts`).
  - Hệ thống mô phỏng việc đồng bộ hóa danh bạ ảo này qua các ứng dụng OTT hàng đầu như Zalo, Telegram, WhatsApp, Snapchat, Viber.
  - Từ profile của mục tiêu trên các ứng dụng này, trích xuất: `User Names` (Tên định danh), `Real Name`, và `Avatar URL`.
- **Đầu ra:** Mảng các tài khoản mạng xã hội và username tương ứng `{ app: string, username: string, displayName: string, avatarUrl: string }[]`.

### Module 5 — Data Brokers & Dorking Engine
- **Chức năng:** Tự động hóa quá trình thu thập thông tin từ các trang bán dữ liệu (Data Brokers) và Google Dorking.
- **Phân luồng:**
  1. **IntelTechniques Tool Aggregator:** Truy vấn song song tới các dịch vụ tìm kiếm người dùng (People Search):
     - `FastPeopleSearch`, `TruePeopleSearch`, `Pipl / 411`, `True Caller`, `That's Them`, `Sync.me`, `WP Plus`.
     - *Kết quả thu được:* Tên thật (`Name`), địa chỉ thực (`Real Address`), và danh sách người thân liên quan (`Relatives`).
  2. **Google Custom Search Engine (CSE):** Thực hiện Google Dorking tự động với số điện thoại nhằm phát hiện dấu vết số điện thoại trên các trang vàng hoặc website doanh nghiệp, lấy về:
     - Tên (`Name`), Địa chỉ (`Real Address`), Công việc/Doanh nghiệp (`Business`).
- **UI Rendering:** Các liên kết Google Dorking đã biên dịch (Dork URLs) sẽ được gửi thẳng về giao diện và render trực quan thông qua component chuyên dụng `<DorkLinksPanel />` trên Dashboard, hỗ trợ phân tích viên click trực tiếp mở tab tra cứu nhanh, thay vì đính kèm vào PDF báo cáo (`<DossierExport />`) nhằm giữ cho PDF chuyên nghiệp và sạch đẹp.

---

## 3. Luồng Dữ Liệu Tổng Thể

```
                      ┌───────────────────────┐
                      │    TELEPHONE INPUT    │
                      └───────────┬───────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Module 1: Validator Gate │
                    └─────────────┬─────────────┘
                                  │
                                  ├─► [INVALID] ──► STOP SCAN (Error response)
                                  │
                                  ▼ [VALID]
               ┌──────────────────┴──────────────────┐
               │ Parallel Execution Lanes            │
               ├─────────────────────────────────────┤
               │ Lane A: Facebook Discovery          │
               │ Lane B: Reverse Lookup Engine       │
               │ Lane C: Mobile Sync Simulation      │
               │ Lane D: Data Brokers & Dorking      │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Consolidated Dossier     │
                    │  - Real Name, Real Address│
                    │  - Relatives, Business    │
                    │  - User Names, Socials    │
                    └─────────────┬─────────────┘
                                  │
                        ┌─────────┴─────────┐
                        ▼                   ▼
                 [Real-time UI]       [PDF Dossier]
                   Svelte SSE        Page Classified
```

---

## 4. Đặc Tả Dữ Liệu & Hợp Đồng SSE

SSE event stream gửi từ `/api/scan-phone?target=<phone>` sẽ phát ra các sự kiện theo định dạng sau:

```javascript
// 1. Validation Complete
event: 'result'
data: { "module": "validation", "status": "VALID", "data": { "valid": true, "formatted": "+84987654321", "countryCode": "VN", "carrier": "Viettel" } }

// 2. Reverse Lookup Complete
event: 'result'
data: { "module": "caller_id", "status": "FOUND", "data": { "realName": "Nguyen Van A", "location": "Hanoi, VN", "carrier": "Viettel", "sources": ["Twilio", "WhoCalld"] } }

// 3. Data Brokers & Dorking Complete
event: 'result'
data: { "module": "people_search", "status": "FOUND", "data": { "name": "Nguyen Van A", "realAddress": "123 Tran Hung Dao, Hanoi", "relatives": ["Nguyen Van B (Brother)"], "business": "FPT Software" } }

// 4. Facebook Discovery Complete
event: 'result'
data: { "module": "facebook", "status": "FOUND", "data": { "profileUrl": "https://facebook.com/nva.dev", "pageName": "NVA Mobile Shop", "candidateName": "Nguyen Van A" } }

// 5. Mobile App Sync Complete
event: 'result'
data: { "module": "contact_sync", "status": "DONE", "data": [ { "app": "Telegram", "username": "nva_dev", "displayName": "Nguyen Van A", "avatarUrl": "https://gravatar.com/avatar/..." } ] }

// 6. Complete Dossier End
event: 'end'
data: { "dossier": { ...consolidatedData } }
```

---

## 5. Cấu Trúc File Dossier PDF

PDF kết xuất từ `/api/dossier` cho số điện thoại sẽ tuân thủ cấu trúc 5 trang trang trọng giống như Email:
1. **Trang 1: Bìa (Cover Page):** Nhãn hiệu Classified đỏ đô, số điện thoại bị che một phần (`+84987***321`), thời gian và thời lượng quét.
2. **Trang 2: Chủ Thể (Subject Profile):** Tên thật, địa chỉ thực, thông tin công việc, các mối quan hệ người thân.
3. **Trang 3: Phát Hiện Mạng Xã Hội (Social Platform Findings):** Bảng các tài khoản OTT và mạng xã hội phát hiện từ luồng giả lập Android Emulator và Facebook.
4. **Trang 4: Chi Tiết Danh Bạ & Dữ Liệu Broker:** Chi tiết kết quả Caller ID và dữ liệu địa chỉ từ People Search.
5. **Trang 5: Phụ Lục (Appendix):** Phương pháp nghiên cứu, giới hạn hoạt động lab, cảnh báo miễn trừ trách nhiệm và ngày quét.
