# CLAUDE.md — Sehat Project Guide

## Project Overview
Sehat is a voice-first, multilingual medical triage agent for India. Single Next.js 16 monolith with Anthropic Claude Opus 4.6 and OpenAI Whisper.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **AI**: Anthropic Claude Opus 4.6 with extended thinking (`@anthropic-ai/sdk`)
- **Voice**: OpenAI Whisper API (`openai` package)
- **Styling**: Tailwind CSS 3.4
- **Deployment**: Vercel (single deployment)

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run linter
```

## Key Files
- `src/lib/prompts.ts` — System prompt (most critical file, clinical triage framework)
- `src/lib/triage-agent.ts` — Anthropic SDK wrapper with extended thinking + streaming
- `src/lib/emergency-detector.ts` — Multilingual emergency keyword detection
- `src/app/api/triage/route.ts` — SSE streaming API route
- `src/app/api/transcribe/route.ts` — Whisper transcription API route
- `src/app/page.tsx` — Main page with conversation state machine
- `src/types/index.ts` — All TypeScript types

## Architecture
- Single Next.js app with API routes (no separate backend)
- Two-layer emergency detection (client + server)
- SSE streaming for real-time thinking display
- `useReducer` state machine for conversation flow
- Max 2 follow-up questions, then triage with available info

## Environment Variables
```
ANTHROPIC_API_KEY=...   # Required
OPENAI_API_KEY=...      # Required for voice input
```

## Safety Rules
- Never store API keys in code
- All medical output includes disclaimers
- Emergency detection errs on false positive side
- WORST-FIRST triage principle
