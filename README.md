# Sehat (सेहत) — AI Medical Triage for 700 Million

**Voice-first, multilingual medical triage agent for India.** Powered by Claude Opus 4.6 with extended thinking.

> *"Doctors in Tamil Nadu don't speak Hindi. I couldn't explain my chest pain."* — Migrant worker, healthcare access study
>
> Sehat puts a multilingual first-responder in every pocket. It does NOT diagnose — it triages.

---

## The Problem

- **1:11,082** doctor-to-patient ratio in rural India (vs 1:811 national average)
- **80%** of doctors concentrated in urban areas, while **70%** of population is rural
- **53%** of emergency physicians report critical incidents caused by language barriers
- **71%** of adolescent girls don't know about menstruation before their first period
- **1.6 million** Indians die annually from poor quality of care — more than from lack of access

## What Sehat Does

1. **Speak or type** symptoms in any of 7 Indian languages (Hindi, Tamil, Telugu, Marathi, Kannada, Bengali, English)
2. **Opus 4.6 reasons** through clinical triage protocols with visible extended thinking — you see the AI's medical reasoning in real-time
3. **Severity classification**: Emergency → Urgent → Routine → Self-care
4. **Bilingual action plan**: where to go, what to tell the doctor, what NOT to do — in English + patient's language
5. **Printable doctor card**: Take a bilingual summary to your clinic visit

---

## Features

### Core Triage
- **7 Indian Languages** with Hinglish/code-mixing support
- **Voice Conversation Mode**: Continuous hands-free loop (speak → triage → TTS → auto-listen)
- **Sarvam AI** for Indian-language STT (Saarika v2.5) and TTS (Bulbul v3 via WebSocket streaming)
- **Zero-Latency Emergency Detection**: 200+ multilingual keywords catch life-threatening emergencies in <50ms — including anaphylaxis, diabetic emergencies, dengue warning signs, burns, road accidents
- **Transparent AI Reasoning**: Watch Opus 4.6's extended thinking chain stream in real-time with step detection
- **Exportable Doctor Card**: Bilingual PDF with severity, symptoms, clinical summary, first aid, warnings — with language selector (English/Local/Bilingual)
- **Dangerous Home Remedy Warnings**: Culturally specific (toothpaste on burns, tourniquets for snake bites, gripe water for diarrhea, spoons in mouth during seizures, etc.)
- **WORST-FIRST Triage Principle**: When uncertain, classify at higher severity (mirrors ESI/MTS clinical frameworks)
- **Clinical Red Flags**: Sepsis, diabetic emergencies, anaphylaxis, tropical diseases (dengue/malaria/leptospirosis), environmental hazards (heat stroke, pesticide exposure), neonatal/pediatric specific flags
- **Calm Audio**: Ambient sound during AI thinking phase to make the wait feel intentional

### Period Health Companion (NEW)
AI-powered menstrual health tracker for rural Indian women:
- **Cycle logging** with flow level, symptoms, mood tracking
- **AI predictions** for next period based on logged history
- **Multilingual AI Q&A** about period health, PCOS, hygiene, nutrition — powered by Claude
- **In-app notifications** for upcoming/late periods
- **Voice readback** of AI answers in local language
- Breaks the taboo: educates women who may be learning about menstruation for the first time

### Data & Analytics
- **Chat History**: Browse and replay past triage sessions with full thinking chain
- **Medical Reports**: Collapsible report cards with severity filtering, Export PDF per report, copy to clipboard
- **Health Dashboard**: Personal health trends, severity breakdown, symptom frequency, timeline
- **Document Analysis**: Upload lab reports/prescriptions — Claude explains them in simple language
- **Admin Telemetry**: Supabase-backed persistent metrics with admin gate

### Security
- **Prompt injection defense**: Input validation, system prompt hardening, user message delimiters, output schema validation
- **Rate limiting**: Per-IP limits on triage (20/min), transcribe (30/min), TTS (50/min)
- **Input sanitization**: Control character stripping, max length enforcement, injection pattern detection
- **Emoji stripping**: All patient-facing output cleaned for TTS compatibility

---

## Architecture

```
User (Voice/Text) → Client Emergency Detection (<1ms)
                   ↓
              Next.js API Route → Server Emergency Detection
                   ↓
              Claude Opus 4.6 (Extended Thinking, 10K token budget)
                   ↓
              SSE Stream → Thinking Chain + Severity Card + Action Plan
                   ↓
              Supabase (sessions, messages, results, telemetry)
                   ↓
        Voice Mode: TTS auto-speaks → auto-listens → loop continues
```

**Key design decisions:**
- **Single Next.js 16 monolith** — no separate backend, single deployment
- **Two-layer emergency detection** — client-side deterministic + server-side contextual
- **SSE streaming** — thinking chain streams to UI in real-time
- **Fire-and-forget DB writes** — non-blocking persistence, graceful fallback
- **WebSocket TTS proxy** — server-side proxy to Sarvam WS API for progressive MP3 streaming

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| AI Engine | Claude Opus 4.6 with Extended Thinking |
| Voice STT | Sarvam AI Saarika v2.5 |
| Voice TTS | Sarvam AI Bulbul v3 (WebSocket streaming) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Clerk (optional, graceful fallback) |
| Styling | Tailwind CSS (mobile-first, glass morphism) |
| Language | TypeScript (strict mode) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Anthropic API key (Opus 4.6 access)
- Sarvam AI API key (for Indian-language STT/TTS)

### Setup

```bash
git clone https://github.com/sahaib/sehat.git
cd sehat
npm install
```

Create `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-...
SARVAM_API_KEY=sk_...
# Optional
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
ADMIN_CLERK_IDS=user_...
```

Run:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Severity Levels

| Level | Color | Care Level | Urgency |
|-------|-------|-----------|---------|
| Emergency | Red | ER / Call 112 | Immediate |
| Urgent | Orange | District Hospital | Within 24 hours |
| Routine | Yellow | PHC / Local clinic | Within a week |
| Self-care | Green | Home care | When convenient |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main triage interface (voice + text) |
| `/period-health` | Period health tracker + AI Q&A |
| `/history` | Past triage sessions |
| `/history/[id]` | Session replay with thinking chain |
| `/reports` | Triage reports + document analyses |
| `/dashboard` | Personal health trends |
| `/analytics` | System-wide telemetry (admin) |

---

## Safety & Ethics

- Every output includes: *"This is not a medical diagnosis"*
- Never names specific diseases as diagnosis
- Never recommends specific medicines or dosages
- Emergency detection errs on caution (false positives > false negatives)
- WORST-FIRST triage principle mirrors clinical ESI/MTS frameworks
- Ephemeral by default — opt-in persistence only for signed-in users
- Open source for medical community audit

---

## Hackathon

**Built with Opus 4.6: a Claude Code Hackathon** (Feb 10-16, 2026)
- Problem Statement: PS2 — Break the Barriers
- Team: Solo builder (Sahaib Singh Arora)
- Selected from 13,000+ applicants (500 participants)

### How Opus 4.6 is Used
- **Extended thinking** (10K token budget for text, 2K for voice) for structured 8-step clinical reasoning visible to users
- **Multilingual code-switching** — handles Hinglish, Tanglish naturally across 7 languages
- **WORST-FIRST reasoning** — considers worst-case scenario first, then works down (mirrors ESI/MTS)
- **Cultural sensitivity** — appropriate address forms, Indian healthcare system mapping, home remedy warnings
- **Document analysis** — explains lab reports and prescriptions in simple language
- **Period health AI** — menstrual health education in 7 Indian languages
- **6 iterations of prompt refinement** — from 200 words to 4,200 words of clinical reasoning framework

See [docs/ITERATION_LOG.md](docs/ITERATION_LOG.md) for the full evolution from v0.1 to v0.6.

---

## License

MIT — see [LICENSE](LICENSE)
