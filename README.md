# Sehat (सेहत) — AI Medical Triage Assistant

**Voice-first, multilingual medical triage for India.** Powered by Claude Opus 4.6 with extended thinking.

> 700 million Indians live more than 5km from a doctor. Sehat puts a multilingual first-responder in everyone's pocket.

## What It Does

Sehat helps underserved populations understand symptom severity and get directed to the right level of care. It does NOT diagnose — it triages.

1. **Speak or type** symptoms in any of 7 Indian languages
2. **Opus 4.6 reasons** through clinical triage protocols with visible extended thinking
3. **Severity classification**: Emergency → Urgent → Routine → Self-care
4. **Action plan** in your language: where to go, what to tell the doctor, what NOT to do

## Features

- **7 Indian Languages**: Hindi, Tamil, Telugu, Marathi, Kannada, Bengali, English
- **Voice Conversation Mode**: Continuous hands-free loop — speak → transcribe → triage → TTS → auto-listen — like talking to a real first-responder
- **Voice-First**: Sarvam AI Saarika for Indian-language STT, Sarvam Bulbul v3 for natural TTS
- **Zero-Latency Emergency Detection**: Keyword matching in all 7 languages catches life-threatening emergencies before the AI processes
- **Transparent AI Reasoning**: Watch Opus 4.6's extended thinking chain in real-time
- **Bilingual Doctor Summary**: Printable summary in English + patient's language
- **Dangerous Home Remedy Warnings**: Proactively warns against harmful practices (toothpaste on burns, tourniquets for snake bites, etc.)
- **Cultural Competence**: Respectful address forms, Hinglish code-mixing support, Indian healthcare system awareness
- **Multi-Turn Conversation**: Up to 2 follow-up questions for ambiguous symptoms

## Architecture

```
User (Voice/Text) → Client Emergency Detection (<1ms)
                   ↓
              Next.js API Route → Server Emergency Detection
                   ↓
              Claude Opus 4.6 (Extended Thinking)
                   ↓
              Streamed Response → Severity Card + Action Plan + Doctor Summary
                   ↓
        Voice Mode: TTS auto-speaks → auto-listens → loop continues
```

**Key design decisions:**
- **Single Next.js monolith** — no separate backend, single Vercel deployment
- **Two-layer emergency detection** — client-side instant + server-side contextual
- **SSE streaming** — thinking chain streams to UI in real-time
- **WORST-FIRST triage principle** — when uncertain, classify higher severity

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| AI Engine | Claude Opus 4.6 with Extended Thinking |
| Voice STT | Sarvam AI Saarika (Indian languages) |
| Voice TTS | Sarvam AI Bulbul v3 (natural Indian-language speech) |
| Styling | Tailwind CSS (mobile-first) |
| Language | TypeScript (strict mode) |

## Getting Started

### Prerequisites
- Node.js 18+
- Anthropic API key (Opus 4.6 access)
- OpenAI API key (for Whisper transcription)

### Setup

```bash
git clone https://github.com/sahaib/sehat.git
cd sehat
npm install
```

Create `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Run:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Severity Levels

| Level | Color | Care Level | Urgency |
|-------|-------|-----------|---------|
| Emergency | Red | ER / Call 112 | Immediate |
| Urgent | Orange | Hospital / Clinic | Within 24 hours |
| Routine | Yellow | PHC / Local clinic | Within a week |
| Self-care | Green | Home care | When convenient |

## Safety & Ethics

- Every output includes a disclaimer: "This is not a medical diagnosis"
- Never names specific diseases as diagnosis
- Never recommends specific medicines or dosages
- Emergency detection errs on the side of caution (false positives > false negatives)
- No personal health data stored — all conversations are ephemeral
- Open source for medical community audit

## Hackathon

**Built with Opus 4.6: a Claude Code Hackathon** (Feb 10-16, 2026)
- Problem Statement: PS2 — Break the Barriers
- Team: Solo builder (Sahaib Singh Arora)

## License

MIT — see [LICENSE](LICENSE)
