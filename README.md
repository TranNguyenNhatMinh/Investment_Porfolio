<div align="center">

# 💼 Investment Portfolio

### Dashboard theo dõi danh mục đầu tư cá nhân

Tổng hợp **Binance Crypto**, **cổ phiếu Việt Nam**, **tiết kiệm ngân hàng** và **MoMo**  
vào một dashboard duy nhất, kèm agent tự động mua khi thị trường giảm theo cấu hình an toàn.

<br />

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)

<br />

**Portfolio tracking · Real-time analytics · Dip buying automation · Telegram alerts**

</div>

---

## 📌 Tổng quan

**Investment Portfolio** là ứng dụng quản lý tài sản cá nhân, giúp theo dõi nhiều loại tài sản trong một nơi duy nhất:

- ₿ Crypto từ Binance
- 📈 Cổ phiếu/quỹ Việt Nam
- 🏦 Tiết kiệm ngân hàng
- 💰 Ví MoMo
- 🤖 Agent tự động mua crypto khi giá giảm
- 📱 Báo cáo và thông báo qua Telegram

Ứng dụng được thiết kế cho nhu cầu theo dõi tài sản cá nhân, phân tích biến động danh mục và tự động hóa một số chiến lược mua tích lũy có kiểm soát rủi ro.

---

## ✨ Tính năng chính

| Module | Mô tả |
|---|---|
| 📊 **Dashboard** | Theo dõi tổng tài sản, P&L, phân bổ danh mục và biến động theo thời gian |
| ₿ **Crypto Portfolio** | Đồng bộ Binance, lịch sử Spot/DCA/Convert, biểu đồ klines thực |
| 🤖 **Dip Buy Agent** | Tự động mua crypto khi giá giảm vượt ngưỡng cấu hình |
| 📈 **Vietnam Stocks** | Theo dõi quỹ/cổ phiếu với NAV real-time từ TCBS |
| 🏦 **Savings Tracker** | Theo dõi tiết kiệm ngân hàng lãi đơn và MoMo lãi kép hàng tháng |
| 📱 **Telegram Bot** | Gửi thông báo giao dịch và báo cáo tài sản mỗi sáng |

---

## 🤖 Dip Buy Agent

Agent tự động mua crypto khi thị trường giảm theo điều kiện đã cấu hình, đi kèm nhiều lớp kiểm soát an toàn.

### Safety checks

- ✅ Giới hạn chi tiêu theo ngày
- ✅ Kiểm tra số dư USDT trước khi đặt lệnh
- ✅ Cooldown timer giữa các lần mua
- ✅ Dry-run mode để thử nghiệm trước khi dùng tiền thật
- ✅ Atomic transaction để đảm bảo audit trail
- ✅ Gửi thông báo Telegram sau mỗi lần mua

### Ví dụ thông báo Telegram

```text
🤖 DIP AGENT — ĐÃ MUA

✅ BTC thay đổi -3.52%
💵 Đã mua: 0.000120 BTC ($9.50)
💲 Giá thực thi: $79,200.00
📊 Hôm nay: $9.50 / $50.00
⏰ 05/05/2026 14:30
```

---

## 📊 Portfolio Analytics

Ứng dụng hỗ trợ phân tích danh mục theo thời gian thực:

- Biểu đồ giá từ Binance klines thực
- Tính giá vốn FIFO dựa trên lịch sử giao dịch đầy đủ
- Tự động phân tích P&L hôm nay so với hôm qua
- Theo dõi phân bổ tài sản theo từng nhóm
- Hỗ trợ dữ liệu lịch sử Spot, DCA và Convert
- Dashboard real-time thông qua WebSocket

---

## 🛠 Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 · Tailwind CSS · Recharts · Socket.io |
| **Backend** | NestJS · Prisma · PostgreSQL · JWT |
| **APIs** | Binance · TCBS · ExchangeRate |
| **Automation** | Cron Jobs · WebSocket · Telegram Bot |
| **Database** | PostgreSQL 16 |
| **Language** | TypeScript 5 |

</div>

---

## 🧱 Kiến trúc hệ thống

```text
Frontend - Next.js
        |
        | REST API / WebSocket
        v
Backend - NestJS
        |
        | Prisma ORM
        v
PostgreSQL
        |
        +-- Binance API
        +-- TCBS API
        +-- ExchangeRate API
        +-- Telegram Bot
```

---

## 🚀 Cài đặt & Chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/your-username/investment-portfolio.git
cd investment-portfolio
```

### 2. Cài dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` cho backend:

```bash
cp backend/.env.example backend/.env
```

Cấu hình các biến môi trường:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/investment"

# Auth
JWT_SECRET="your-secret"

# Binance
BINANCE_API_KEY="your-key"
BINANCE_SECRET_KEY="your-secret"

# Telegram - Optional
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"

# AI Analysis - Optional
ANTHROPIC_API_KEY="your-key"
```

### 4. Migrate database

```bash
cd backend
npx prisma migrate deploy
```

### 5. Chạy backend

```bash
cd backend
npm run start:dev
```

Backend mặc định chạy tại:

```text
http://localhost:3002
```

### 6. Chạy frontend

```bash
cd frontend
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:3001
```

---

## 📂 Cấu trúc thư mục

```text
investment-portfolio/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
└── README.md
```

---

## 🔐 Lưu ý bảo mật

Không commit các file hoặc thông tin nhạy cảm sau:

- `.env`
- API key Binance
- Secret key Binance
- JWT secret
- Telegram bot token
- Database connection string thật

Nên bật **dry-run mode** trước khi cho phép Dip Buy Agent giao dịch bằng tiền thật.

---

## ⚠️ Disclaimer

Ứng dụng được xây dựng cho mục đích theo dõi và quản lý tài sản cá nhân.

Dữ liệu trong ứng dụng chỉ mang tính tham khảo, không phải tư vấn tài chính, đầu tư hoặc pháp lý.

**Dip Buy Agent có thể thực hiện giao dịch bằng tiền thật.**  
Luôn kiểm tra cấu hình, giới hạn chi tiêu và chạy dry-run trước khi bật giao dịch thật.

---

<div align="center">

Made with ❤️ for personal use

</div>
