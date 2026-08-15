# Autonomous AI Sales Agent

**AgentHack Challenge Submission** — A complete, end-to-end autonomous sales pipeline that understands your company, discovers the right leads, researches them deeply, qualifies with confidence scoring, matches the right service, generates personalized outreach, classifies responses, schedules meetings, and maintains memory across the full customer lifecycle.

## 🎯 Overview

This system is **not a chatbot**. It operates as a complete sales team:

```
Company PDF/Text → RAG → ICP → Lead Discovery → Cheap Filtering → Deep Research
→ Qualification (Score + Service Match) → Decision-Makers → Personalized Outreach
→ Response Classification → Follow-up → Meeting Scheduling → Memory → Pipeline
```

## ✨ Features (All Required + Extras)

| Area | Implementation |
|------|----------------|
| **Company Knowledge** | PDF/text ingest → chunking → embeddings → structured RAG extraction |
| **ICP Builder** | Structured form → LLM converts to keywords + criteria |
| **Lead Discovery** | 3 modes: Demo (fictional), Vendor (paste list), Web Search (Brave/Serper) |
| **Cheap Filtering** | Fast LLM pass eliminates irrelevant companies before expensive research |
| **Deep Research** | Web search + evidence collection → structured profile + buying signals |
| **Qualification** | Confidence score (0-100) with explanation; service matching grounded in RAG |
| **Decision-Makers** | Role-specific contacts (CEO, CTO, Head of Sales, etc.) prioritized by service |
| **Personalized Outreach** | Role-aware emails with evidence-based personalization + meeting link |
| **Email/Meeting** | Resend integration (simulated if no key); auto-generated meeting links |
| **Response Classification** | 9 categories → auto-answer questions/objections, auto-confirm meetings |
| **Follow-Up** | 3-day auto-schedule; second email with new angle; WhatsApp nudge |
| **Meeting Automation** | Fixed time + link; admin WhatsApp notification; 30-min reminder with briefing |
| **Memory** | Short-term (current task) + Long-term (all leads, emails, replies, meetings) |
| **Pipeline** | Kanban view with drag-drop; stages: Discovered → Converted + negative states |
| **WhatsApp** | Twilio integration for outreach + admin notifications (simulated fallback) |

## 🚀 Quick Start (Local)

```bash
# 1. Clone & install
git clone https://github.com/ihusmanigroup/agenthack-sales-agent
cd agenthack-sales-agent
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum add OPENAI_API_KEY

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

## 🧪 Demo Walkthrough (No External APIs Needed)

The app includes **fictional demo companies** and a **sample company (NexaBot AI)** so you can run the full pipeline instantly:

1. **Setup tab** → Click **Load Sample Company (NexaBot AI)** → RAG builds automatically
2. **Setup tab** → Fill ICP (e.g., Location: Pakistan, Industry: Logistics, Size: 50-200, Target: High WhatsApp volume) → Save ICP
3. **Setup tab** → Discovery mode: **Demo** → Run Discovery & Cheap Filtering
4. **Leads tab** → Click a lead → **Run Deep Research** → **Qualify & Match Service**
5. **Leads tab** → Qualified lead → **Send Outreach Emails** (simulated)
6. **Inbox tab** → Paste a fake reply (e.g., "Interested, can we meet Tuesday?") → Classify & Auto-Respond → meeting auto-scheduled
7. **Meetings tab** → See meeting with briefing + admin WhatsApp notification
8. **Pipeline tab** → Drag leads across stages
9. **Memory tab** → Full history, RAG index, activity log

## 📦 Production Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Vercel
- Import the GitHub repo in Vercel
- Add **Environment Variables** from `.env.example` (at minimum `OPENAI_API_KEY`)
- **Strongly Recommended**: Enable **Vercel KV (Upstash Redis)** integration for persistent memory across serverless invocations. The app auto-detects `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
- Deploy

### 3. Vercel Cron (Automatic Follow-ups & Reminders)
The endpoint `/api/cron` runs due follow-ups and meeting reminders. Add a **Vercel Cron Job**:

```json
// vercel.json (auto-created by Vercel for cron)
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/15 * * * *" }
  ]
}
```

Or set manually in Vercel Dashboard → Settings → Cron Jobs → `GET /api/cron` every 15 minutes.

## 🔧 Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | ✅ | LLM (gpt-4o-mini) + embeddings (text-embedding-3-small) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | ⚠️ Recommended | Persistent memory on Vercel (Upstash Redis) |
| `RESEND_API_KEY` + `EMAIL_FROM` | Optional | Real email sending |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_FROM` + `ADMIN_WHATSAPP` | Optional | Real WhatsApp sending & admin alerts |
| `BRAVE_API_KEY` or `SERPER_API_KEY` | Optional | Live web search for discovery & research |
| `BOOKING_URL` | Optional | Your Calendly/booking link (else fake meet.google.com) |
| `SELLER_NAME` | Optional | Name in email signatures |
| `EMBED_MODEL` | Optional | Embedding model (default: text-embedding-3-small) |

## 🏗 Architecture

```
app/
├── api/
│   ├── state/route.ts           # GET/POST memory (localStorage mirror)
│   ├── ingest/route.ts          # PDF/text → RAG
│   ├── icp/route.ts             # Save ICP
│   ├── discover/route.ts        # Lead discovery + cheap filtering
│   ├── research/route.ts        # Deep research
│   ├── qualify/route.ts         # Qualification + service match
│   ├── outreach/route.ts        # Generate & send emails
│   ├── reply/route.ts           # Classify + auto-respond
│   ├── meeting/route.ts         # Finalize meeting + notify admin
│   ├── followup/route.ts        # Schedule/run follow-ups
│   ├── transition/route.ts      # Pipeline stage change
│   ├── reminders/route.ts       # Run 30-min meeting reminders
│   └── cron/route.ts            # Vercel cron: follow-ups + reminders
├── components/
│   ├── Dashboard.tsx            # Main client app (tabs, state)
│   ├── SetupTab.tsx             # Company ingest, ICP, discovery
│   ├── PipelineTab.tsx          # Kanban drag-drop
│   ├── LeadsTab.tsx             # Lead detail + actions
│   ├── InboxTab.tsx             # Replies, follow-up queue, email history
│   ├── MeetingsTab.tsx          # Meetings + reminders
│   └── MemoryTab.tsx            # RAG, short/long-term memory, activity log
└── lib/
    ├── types.ts                 # All TypeScript interfaces
    ├── storage.ts               # Memory persistence (Upstash + in-memory fallback)
    ├── llm.ts                   # OpenAI chat + JSON extraction
    ├── rag.ts                   # Chunking, embeddings, cosine search
    ├── ingest.ts                # PDF parse + company knowledge extraction
    ├── icp.ts                   # ICP builder
    ├── discovery.ts             # Candidates + cheap filter + lead creation
    ├── demoLeads.ts             # 12 fictional demo companies
    ├── search.ts                # Brave/Serper web search
    ├── research.ts              # Deep research + evidence
    ├── qualify.ts               # Score + service match + contacts
    ├── outreach.ts              # Personalized emails + WhatsApp
    ├── meeting.ts               # Meeting links + briefings + admin notify
    ├── classify.ts              # Reply classification + Q&A
    ├── followup.ts              # Follow-up scheduling + email #2
    ├── pipeline.ts              # Stage transitions + summary
    ├── channels.ts              # Email (Resend) + WhatsApp (Twilio) senders
    ├── serialize.ts             # Client-safe memory serialization
    └── client.ts                # Frontend fetch helpers + localStorage mirror
```

## 🧠 Design Decisions

- **RAG over vector DB**: Embeddings stored in memory (Upstash if available). Cosine similarity search is fast and requires no external vector DB.
- **Grounded generation**: Every email, qualification, and answer uses `ragContext()` to pull relevant company knowledge — no hallucinated services or pricing.
- **Cheap filtering first**: LLM filters 20+ candidates in one call before expensive deep research.
- **Service matching from RAG**: Qualification prompt receives the exact service list from company knowledge; matched service name must be from that list.
- **Simulated by default**: All external channels (email, WhatsApp, search) work in simulation mode without keys — perfect for demos and CI.
- **LocalStorage mirror**: Client caches state to survive serverless cold starts on free Vercel without KV.
- **Single-page Kanban**: Drag-and-drop pipeline updates via `/api/transition`.

## 📹 Demo Videos (Required for Submission)

| Video | Max Duration | Content |
|-------|--------------|---------|
| Live Demo | 1.5 min | End-to-end workflow: Ingest → ICP → Discovery → Research → Qualify → Outreach → Reply → Meeting |
| Code Explanation | 1 min | Architecture, agents, RAG, memory, tools, key decisions |

Record both and include links in your submission.

## 📁 Submission Checklist

- [x] GitHub repo with `.env.example`
- [x] Live demo on Vercel
- [x] Demo video (≤1.5 min)
- [x] Code explanation video (≤1 min)

## 🤝 License

MIT — use freely for learning and building.

---

Built for **AgentHack Challenge** — Autonomous AI Sales Agent.