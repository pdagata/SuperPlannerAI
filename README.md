# AgileFlow AI 🚀

AI-powered Agile project management SaaS platform.

## ✨ Features

- **Multi-tenant** — each workspace is fully isolated
- **Role-based access** — SuperAdmin, Admin, Developer, QA
- **AI Assistant** — Gemini, OpenAI GPT-4, Anthropic Claude (configurable per workspace)
- **Kanban board** — tasks, stories, bugs, issues
- **Sprint planning** — epics, features, sprints
- **Billing** — Stripe subscriptions (Free / Pro / Enterprise)
- **Invitations** — invite teammates by email
- **JWT auth** — bcrypt passwords, refresh tokens
- **PostgreSQL or SQLite** — same codebase, auto-detected

---

## 🖥️ Run Locally on Mac

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in at minimum: JWT_SECRET and at least one AI key

# 3. Start (uses SQLite automatically)
npm run dev
# → http://localhost:3000
```

---

## 🐳 Run with Docker

### SQLite (simplest)
```bash
cp .env.example .env
# Edit .env with your keys
docker-compose -f docker-compose.sqlite.yml up --build
```

### PostgreSQL (production-ready)
```bash
cp .env.example .env
# Edit .env, then uncomment DATABASE_URL
docker-compose up --build
```

---

## 🔐 Demo Credentials

| Role        | Username    | Password   |
|-------------|-------------|------------|
| Super Admin | superadmin  | super123   |
| Admin       | admin1      | admin123   |
| Developer   | dev1        | dev123     |
| QA          | qa1         | qa123      |

---

## 💳 Stripe Setup

1. Create products in [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy Price IDs to `STRIPE_PRICE_PRO` and `STRIPE_PRICE_ENTERPRISE`
3. Set up webhook: `POST /api/stripe/webhook`
4. Events to listen: `customer.subscription.updated`, `customer.subscription.deleted`

---

## 🤖 AI Configuration

Each workspace can configure:
- **Provider**: Gemini, OpenAI, or Claude
- **Model**: specific model per provider
- **System prompt**: custom instructions
- **Tone**: professional, casual, technical, friendly
- **Temperature**: 0 (precise) → 1 (creative)
- **Auto-actions**: natural language triggers

Go to **Settings → AI Configuration** to set up.

---

## 📦 Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Frontend   | React 19, TypeScript, Tailwind |
| Backend    | Node.js, Express, TypeScript   |
| Database   | SQLite (dev) / PostgreSQL (prod)|
| Auth       | JWT + bcrypt + Refresh tokens  |
| AI         | Gemini / OpenAI / Claude       |
| Billing    | Stripe Subscriptions           |
| Email      | Nodemailer (SMTP)              |
| Deploy     | Docker + docker-compose        |

---

## 🏗️ Role Permissions

| Feature              | SuperAdmin | Admin | Dev | QA |
|----------------------|:----------:|:-----:|:---:|:--:|
| Create projects      | ✅ | ❌ | ❌ | ❌ |
| Manage billing       | ✅ | ❌ | ❌ | ❌ |
| Configure AI         | ✅ | ✅ | ❌ | ❌ |
| Invite users         | ✅ | ✅ | ❌ | ❌ |
| Manage team members  | ✅ | ✅ | ❌ | ❌ |
| Sprint planning      | ✅ | ✅ | ❌ | ❌ |
| Kanban / tasks       | ✅ | ✅ | ✅ | ✅ |
| AI assistant         | ✅ | ✅ | ✅ | ✅ |
| Testing              | ✅ | ✅ | ✅ | ✅ |
