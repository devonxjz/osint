Dưới đây là mã Markdown thuần của bản PRD để bạn có thể dễ dàng sao chép và dán vào các trình soạn thảo (như Obsidian, Notion, hoặc VS Code):

```markdown
# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD)

**Tên Sản phẩm:** Nền tảng Phân tích Tên miền & Trinh sát Tự động (Automated Domain OSINT & Reconnaissance Platform)  
**Phiên bản:** 2.0 (Bản Toàn diện)  

## 1. Tổng quan dự án
Module **Domain OSINT** là hệ thống tự động hóa toàn diện việc thu thập, bóc tách, tương quan và phân tích thông tin từ một **Tên miền (Domain Name)** đầu vào. Hệ thống thực hiện OSINT (Open-Source Intelligence) theo nhiều luồng song song, bao quát từ thông tin công khai đến dữ liệu ẩn, lịch sử và mối quan hệ để xây dựng một **Hồ sơ Mục tiêu (Target Profile)** hoàn chỉnh.

## 2. Mục tiêu hệ thống
* **Tự động hóa toàn trình:** Giảm thiểu tối đa thao tác thủ công trong quy trình Information Gathering.
* **Tương quan dữ liệu (Data Correlation):** Gắn kết các mảnh dữ liệu rời rạc thành một mạng lưới thực thể có ý nghĩa.
* **Trực quan hóa:** Biểu diễn các mối quan hệ (Email, IP, Subdomain, Real Name) dưới dạng đồ thị (Node-Graph).
* **Sẵn sàng cho tích hợp:** Xây dựng dưới dạng API-first, cho phép các hệ thống AI Agent hoặc các nền tảng Automated Pentest khác dễ dàng gọi và khai thác dữ liệu.

---

## 3. Chân dung người dùng (User Roles) & Kịch bản (User Stories)

### User Roles
1. **Security Engineer / Penetration Tester:** Sử dụng hệ thống để tìm kiếm bề mặt tấn công (attack surface) của một tổ chức trước khi pentest.
2. **Data Analyst / Threat Intelligence Analyst:** Thu thập dữ liệu, phân tích các chiến dịch lừa đảo (phishing) dựa trên việc truy vết mạng lưới tên miền.
3. **AI Agent (Hệ thống tự động):** Các Agent được lập trình để tự động kích hoạt tiến trình quét và phân tích dữ liệu trả về để ra quyết định bảo mật tiếp theo.

### User Stories (Kịch bản sử dụng)
* **UC1:** Là một Pentester, tôi muốn nhập một danh sách domain vào hệ thống và nhấn "Quét", để hệ thống tự động chạy ngầm và thông báo khi hoàn tất.
* **UC2:** Là một Data Analyst, tôi muốn xem kết quả dưới dạng sơ đồ mạng lưới (Graph), để tôi có thể dễ dàng thấy được một địa chỉ IP đang được chia sẻ bởi bao nhiêu tên miền độc hại khác.
* **UC3:** Là một hệ thống AI Agent, tôi muốn có thể gọi API `POST /api/v1/osint/scan` với payload là tên miền, và nhận về Webhook khi có dữ liệu JSON hoàn chỉnh để tiếp tục kịch bản tự động hóa.
* **UC4:** Là một người dùng, tôi muốn hệ thống tự động cảnh báo (đánh dấu đỏ) những IP hoặc Domain đã từng bị report trong các cơ sở dữ liệu Threat Intelligence.

---

## 4. Yêu cầu Chức năng (Functional Requirements)

### Module 1: Search Engine & Archive Analysis
* **Mục đích:** Thu thập dữ liệu hiện tại, quá khứ và các trang bị ẩn.
* **Chi tiết luồng:**
    * Trích xuất dữ liệu Live Website.
    * Thực thi Google/Bing/Yandex Dorks tự động (VD: `site:domain.com filetype:pdf`).
    * Lấy lịch sử giao diện từ **Wayback Machine**.
    * Quét tệp `robots.txt` để dò tìm **Hidden Pages** & thư mục quản trị.

### Module 2: Analytics & Trackers Traceability
* **Mục đích:** Tìm các website "anh em" cùng chủ sở hữu thông qua mã theo dõi.
* **Chi tiết luồng:** Phân tích mã nguồn Live Website/Documents → Lấy ID của Google Analytics, Adsense, Tag Manager → Truy vấn qua các nguồn (SpyOnWeb, AnalyzeID, PubDB) → Trả về danh sách **New Domains**.

### Module 3: Metadata & Document Extraction
* **Mục đích:** Bóc tách dữ liệu rò rỉ từ các tài liệu công khai.
* **Chi tiết luồng:** Tự động tải các tệp PDF, DOCX, XLSX trên website → Đưa qua engine xử lý (tương tự **FOCA** / **Metagoofil**) → Trích xuất: **Real Name** (Người soạn thảo), **Email Address**, đường dẫn máy chủ nội bộ.

### Module 4: WHOIS & DNS History Analysis
* **Mục đích:** Truy vết định danh chủ sở hữu và lịch sử hạ tầng.
* **Chi tiết luồng:** Truy vấn thông tin đăng ký tên miền hiện tại và lịch sử qua Whoisology, ViewDNS, DNSTrails. Trích xuất **Email Address**, **Real Name**, số điện thoại, tổ chức, và lịch sử thay đổi **IP Address**.

### Module 5: SEO, Backlinks & Social Mapping
* **Mục đích:** Khám phá dấu chân kỹ thuật số và mạng lưới quan hệ.
* **Chi tiết luồng:** Quét Backlinks và SharedCount để tìm các tài khoản **Social Networks** (Facebook, LinkedIn, Twitter) có liên kết chặt chẽ với tên miền.

### Module 6: Infrastructure & Subdomain Enumeration
* **Mục đích:** Rà quét hạ tầng kỹ thuật sâu.
* **Chi tiết luồng:** Chạy các module Pentest Tools để Brute-force và Enumeration cấu trúc DNS nhằm tìm ra tất cả **Sub Domains**. Luồng này có tính đệ quy: từ Sub Domains tìm được sẽ tiếp tục phân tích IP và đẩy ra **New Domains**.

---

## 5. Xử lý Ngoại lệ (Edge Cases & Error Handling)

* **Bảo vệ quyền riêng tư (WhoisGuard / Privacy Protection):** Nếu hệ thống phát hiện WHOIS hiện tại bị ẩn, hệ thống phải *tự động* chuyển hướng truy vấn sang Module Lịch sử (Whois History) để tìm các bản ghi cũ trước khi chủ sở hữu bật tính năng ẩn danh.
* **Rate Limiting & CAPTCHA (Bị chặn do quét quá nhiều):**
    * Hệ thống phải tích hợp một Pool Proxy (Rotating Proxies) để đổi IP liên tục khi thực hiện Google Dorks.
    * Cơ chế Exponential Backoff (chờ và thử lại với thời gian tăng dần) được áp dụng khi API bên thứ 3 trả về mã lỗi 429 (Too Many Requests).
* **Dead Domains (Tên miền đã chết/không trỏ IP):** Bỏ qua bước quét Live Website (Module 1, 2) nhưng vẫn bắt buộc chạy Module 4 (Whois/DNS History) và Wayback Machine để tìm dữ liệu trong quá khứ.

---

## 6. Thiết kế Cơ sở dữ liệu & Cấu trúc Dữ liệu (Data Schema)

Để đáp ứng tính chất kết nối mạng lưới của OSINT, hệ thống sử dụng **Graph Database (Neo4j)** kết hợp với **Relational Database (PostgreSQL)**.

### Định nghĩa Thực thể Graph (Nodes)
* `Node: Domain` (domain_name, created_date, status)
* `Node: IP_Address` (ip_v4, asn, location)
* `Node: Email` (email_address, is_breached)
* `Node: Person` (real_name, job_title)
* `Node: Document` (file_name, file_type, creation_date)
* `Node: Analytics_ID` (tracking_id, type)

### Định nghĩa Mối quan hệ (Edges)
* `(Domain) -[RESOLVES_TO]-> (IP_Address)`
* `(Domain) -[HAS_SUBDOMAIN]-> (Domain)`
* `(Email) -[REGISTERED]-> (Domain)`
* `(Person) -[CREATED]-> (Document)`
* `(Document) -[HOSTED_ON]-> (Domain)`
* `(Domain) -[USES_TRACKER]-> (Analytics_ID)`

---

## 7. Kiến trúc Hệ thống & Tech Stack

Hệ thống được thiết kế theo kiến trúc **Microservices** để đảm bảo tính module hóa, dễ bảo trì và khả năng mở rộng khi tích hợp thêm các công cụ mới.

### Tech Stack Chi tiết
* **Core Backend / Orchestrator:** **Java (Spring Boot)**. Đóng vai trò là API Gateway, quản lý người dùng, cấu hình hệ thống, tiếp nhận yêu cầu và điều phối các tác vụ (Task Orchestration).
* **OSINT & Scraping Workers:** **Python**. Viết các script tự động hóa, crawl dữ liệu, xử lý metadata (các thư viện như `BeautifulSoup`, `requests`, `PyPDF2`, tích hợp logic của FOCA/Metagoofil).
* **Message Broker:** **RabbitMQ**. Quản lý hàng đợi tin nhắn (Queues) giữa Spring Boot và các Python Workers để xử lý hàng ngàn tác vụ bất đồng bộ cùng lúc mà không làm nghẽn hệ thống.
* **Frontend / UI:** **Next.js & React**. Giao diện xử lý phía client cực nhanh, kết hợp Tailwind CSS. Tích hợp thư viện `React Flow` hoặc `Cytoscape.js` để vẽ sơ đồ Node-Graph. **Dark Mode** được thiết lập là chủ đề hiển thị mặc định, tối ưu hóa cho các phiên làm việc giám sát bảo mật dài hạn.
* **Databases:** PostgreSQL (lưu trữ metadata user, lịch sử quét) & Neo4j (lưu trữ và truy vấn đồ thị quan hệ).

---

## 8. Quản lý Cấu hình & API Keys (Configuration Management)

Các công cụ OSINT thường yêu cầu API Key. Hệ thống cung cấp cơ chế quản lý linh hoạt:
* **Global Pool:** Quản trị viên (Admin) cấu hình các API Key dùng chung (Shodan, ViewDNS, Hunter.io) vào hệ thống. Thuật toán Round-robin sẽ phân bổ lượt gọi API để tránh cạn kiệt tài nguyên.
* **User Workspace Settings:** Giao diện cho phép người dùng cá nhân/tổ chức tự nhập API Key riêng của họ. Nếu Key cá nhân được cung cấp, hệ thống sẽ ưu tiên sử dụng Key này thay vì tài nguyên chung của server.

---

## 9. API Endpoints (Mẫu thiết kế RESTful)

Hệ thống cung cấp các API chuẩn để Frontend hoặc AI Agents giao tiếp:

* **Khởi tạo luồng quét mới:**
    `POST /api/v1/osint/scans`
    *Payload:* `{ "target_domain": "example.com", "modules": ["dns", "metadata", "subdomains"] }`
    *Response:* `{ "scan_id": "abc-123", "status": "running" }`
* **Kiểm tra trạng thái quét:**
    `GET /api/v1/osint/scans/{scan_id}/status`
* **Lấy dữ liệu đồ thị (Graph Data):**
    `GET /api/v1/osint/scans/{scan_id}/graph-data`
    *Response:* Trả về chuẩn JSON cấu trúc Nodes/Edges để Frontend render.
* **Lấy danh sách tài liệu bị rò rỉ:**
    `GET /api/v1/osint/scans/{scan_id}/documents`

```