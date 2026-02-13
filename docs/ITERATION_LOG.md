# Iteration Log: Sehat (सेहत)

**Builder:** Sahaib Singh Arora (solo)
**Hackathon:** Built with Opus 4.6 — Claude Code Hackathon (Feb 10-16, 2026)
**Total:** 69 commits, ~12,800 lines of TypeScript, 69 source files, 4 days of development

---

## v0.1 — The Spark (Feb 10, evening)

**Commit:** `11ad31b` — "Build Sehat - multilingual medical triage agent"

Started with a single question: *What if 700 million Indians who lack nearby doctors could get triage-quality guidance from their phone, in their own language?*

**What existed:**
- Basic Next.js app with text input
- Single Anthropic API call to Claude Opus 4.6 with a rudimentary prompt
- English only, no voice, no structured output
- Extended thinking enabled but with no visible reasoning chain

**Problems immediately visible:**
- Claude returned free-form text, impossible to render consistently
- No severity classification structure
- No emergency detection
- Response language was always English regardless of input language

**Key decision:** Use extended thinking not just for quality but as a *visible* feature — let users see the AI reasoning through their symptoms in real-time.

---

## v0.2 — Structured Medical Reasoning (Feb 10-11)

**Commits:** `70892c8` through `35bf556`

**What changed:**
- Designed the 8-step clinical reasoning framework (modeled after ESI/MTS triage systems):
  1. Symptom Extraction
  2. Patient Risk Profile
  3. Red Flag Screening (systematic by body system)
  4. WORST-FIRST Differential Assessment
  5. Severity Classification (4-tier: emergency/urgent/routine/self_care)
  6. Indian Healthcare Context mapping (PHC/district hospital/emergency)
  7. Dangerous Home Remedy Screening
  8. Follow-up Question Decision
- Enforced strict JSON output schema with 15+ fields
- Added Step 0 (query classification) — non-medical queries get warm redirects, not triage cards
- Built the severity card UI with color-coded badges

**The WORST-FIRST principle** became the cornerstone: when uncertain, classify at the highest plausible severity. A headache + fever + stiff neck should be triaged as potential meningitis (emergency), not probable tension headache. This mirrors how real triage systems work — ESI's "life threat first pass."

**Problems:**
- Hindi input worked, but output was often mixed Hindi/English
- No voice input — target users have low literacy
- UI was plain, not mobile-optimized

---

## v0.3 — Voice Pipeline + Indian Languages (Feb 11)

**Commits:** `4c84a83` through `6305a3c`

**What changed:**
- Integrated Sarvam AI for Indian-language STT (Saarika model) and TTS (Bulbul model)
- Initially tried OpenAI Whisper — worked for English but poor for Hindi/Tamil
- Switched to Sarvam: purpose-built for Indian languages, handles code-mixing (Hinglish, Tanglish)
- Added "Read Aloud" button on every response — critical for low-literacy users
- Built zero-dependency Markdown renderer (react-markdown was too heavy)

**Iteration depth on voice:**
1. First attempt: Browser SpeechSynthesis API for TTS — voice sounded robotic and mismatched between languages. **Removed.**
2. Second attempt: Sarvam TTS REST API — 500 char limit, slow, base64 WAV. Worked but laggy.
3. Third attempt: Sarvam TTS WebSocket API (`bulbul:v3`) — progressive MP3 streaming, 2500 char limit, natural voice. **Kept as primary.**
4. Speaker iteration: tried `meera` (not available), `anushka` (decent), settled on `simran` (most natural for Hindi).

**Problems:**
- Voice was one-shot (speak → result). No conversation mode.
- No emergency bypass — life-threatening keywords waited for full Claude reasoning.
- No data persistence.

---

## v0.4 — Voice Conversation Mode + Emergency Bypass (Feb 11)

**Commits:** `749f6be` through `3917192`

**What changed:**
- **Voice Conversation Mode:** Continuous hands-free loop (speak → triage → TTS → auto-listen → repeat). The user never touches the screen after starting.
- **Two-layer emergency detection:**
  - Layer 1 (client-side): Multilingual keyword matching in <50ms. Catches "chest pain," "सांस नहीं आ रही," "மூச்சு விடமுடியவில்லை" BEFORE the API call.
  - Layer 2 (server-side): Contextual detection after input sanitization.
  - Emergency banner appears instantly while Claude reasoning runs in parallel.
- **Clerk authentication** with graceful fallback (app works fully without auth)
- **Supabase persistence** — triage sessions, conversation messages, results stored for history
- **Telemetry system** — tracks language distribution, severity breakdown, latency, for the admin analytics dashboard

**Key design decision:** Emergency detection must be deterministic and fast. We cannot have LLM latency on "my father's face is drooping and he can't lift his arm" — that's a stroke and every second matters.

---

## v0.5 — Full Platform (Feb 11-12)

**Commits:** `26c7807` through `39986d6`

**What changed:**
- **Chat History:** Browse and replay past triage sessions with full thinking chain
- **Medical Reports:** All triage reports with severity filtering, copy, export
- **Health Dashboard:** Personal health trends, severity breakdown, symptom frequency, timeline
- **Printable Doctor Card:** Bilingual summary with reference ID and letterhead — take to your clinic visit
- **Document Analysis:** Upload lab reports/prescriptions, Claude analyzes in simple language
- **Period Health Companion:** AI-powered menstrual health tracker for rural Indian women
  - Cycle logging with flow level, symptoms, mood tracking
  - AI Q&A about period health, PCOS, hygiene, nutrition
  - Full i18n across all 7 Indian languages
  - Gender-aware: ally education view for men/boys
- **TTS WebSocket streaming** via server-side proxy to Sarvam's WS API
- **Session continuation** — resume previous conversations
- **Enhanced ThinkingDisplay** — shows Opus 4.6's reasoning with step detection

**Iteration on period health:** 71% of adolescent girls in India don't know about menstruation before their first period. This feature breaks the taboo by providing science-backed information in the user's language, in a private, judgment-free AI interaction.

---

## v0.6 — Security + Quality Hardening (Feb 12)

**Commits:** `8ee213f` through `793d613`

**What changed:**
- **Prompt injection defense:** Input validation layer (`input-guard.ts`), system prompt security preamble, user message delimiters, output schema validation
- **Clinical triage improvements (8.7 → 9.5 quality score):**
  - Added sepsis, diabetic emergency, anaphylaxis red flags
  - Added tropical/seasonal diseases (dengue, malaria, leptospirosis) — critical for India
  - Added environmental hazards (heat stroke, pesticide exposure, severe burns)
  - Added age-specific fever thresholds (infant <3mo = emergency)
  - Added poison control numbers (AIIMS, CMC Vellore)
  - Expanded dangerous home remedy warnings (diarrhea/ORS, seizure first aid)
  - Added immunocompromised, cardiac, asthma/COPD threshold adjustments
  - WORST-FIRST enforcement when follow-ups exhausted
- **Emergency detector expansion:** +60 keywords across all 7 languages (anaphylaxis, burns, diabetic emergencies, road accidents, scorpion stings)
- **Voice optimizations:**
  - Dynamic thinking budget: 2048 tokens for voice (fast) vs 10K for text (detailed reasoning)
  - Eliminated duplicate TTS calls (was 4-5 per result, now 1)
  - Calm ambient audio during thinking phase (Web Audio API)
  - Voice mode stuck state recovery (20s timeout, never-disabled mic button)
- **PDF export:** Fixed blank PDF, added language selector (Bilingual/English/Local), full triage data in export
- **Reports page redesign:** Collapsible cards, severity filter pills, tabs, Export PDF per report
- **Language enforcement:** Script-specific anchoring to prevent Hindi default on Tamil/Telugu/Kannada/Bengali
- **Emoji stripping** from all patient-facing text (TTS compatibility)
- **Follow-up quality:** Single focused question instead of numbered lists

---

## v0.7 — Agentic Tools + Interactive Follow-ups (Feb 12)

**What changed:**

### Interactive Follow-up Options
When Claude asks a follow-up question (e.g., "How long have you had these symptoms?"), the UI now shows **clickable pill buttons** with common answers — like Claude Code's AskUserQuestion interface. Users can click a pill or type a custom answer.

- `FollowUpOption { label, value }` type added to `src/types/index.ts`
- Claude generates 3-5 options in the user's language with each follow-up question
- New `FollowUpOptions.tsx` component: teal-themed pill buttons with `active:scale-95` press feedback
- Options rendered inline in `ConversationThread.tsx` after follow-up messages
- Auto-disabled when already answered or during streaming
- Clicking a pill calls `handleTextSubmit(value)` — reuses the exact same submission path as typed text, zero new logic needed

**Why it matters:** Target users have low literacy and may struggle to type answers. Tapping a button is universal.

### Action-Taking Tools (3 new write tools)
The existing 10 agentic tools were read-only. Added 3 tools that **write data**, creating a "living" system where data from one triage session enriches future sessions:

1. **`save_clinical_note`** — Saves chronic conditions, allergies, family history, medication interactions. `get_patient_history` now also retrieves these notes, closing the data loop.
2. **`schedule_followup_check`** — Schedules follow-up reminders (e.g., "fever should resolve in 48h"). Writes to `followup_checks` table with computed `check_at` timestamp.
3. **`update_risk_profile`** — Merges newly mentioned conditions/medications into the patient's stored profile. UPSERTs into `profiles.pre_existing_conditions`.

**Design decisions:**
- Action tools are **silent** — Claude never tells the patient it's saving data
- **Fire-and-forget** — failures don't block triage (graceful for anonymous users, missing DB)
- `ToolContext` now carries `sessionId` for linking notes to sessions
- Prompt instructs Claude to call action tools in the same round as read tools when possible

**Total tool count: 13** across 6 categories (Patient Context, Symptom Analysis, Specialist, Women's Health, Regional Intelligence, Actions).

### Profile-Aware Personalization
Previously, Claude started every triage session blind — it didn't know the patient's name, age, gender, or pre-existing conditions even for logged-in users. Profile data sat in Supabase unused.

**Now:** The triage route fetches the user's stored profile and injects it directly into the system prompt:
```
## PATIENT CONTEXT (from stored health profile)
Name: Sahaib
Age: 28
Gender: male
Known pre-existing conditions: Diabetes, Hypertension
```

**Impact:**
- Claude addresses the patient by name ("Sahaib ji, aapke lakshan...")
- Pre-existing conditions automatically factor into severity thresholds (diabetes + fever = minimum urgent)
- Claude doesn't waste a follow-up question asking about conditions it already knows
- Anonymous users still work fine — context section is simply omitted

**Database schema updated:** Added `clinical_notes` and `followup_checks` tables for action tools.

---

## v0.8 — Clinical & Professional UI Overhaul (Feb 13)

**What changed:**

### SehatOrb — Living Brand Identity
Created a signature ambient orb component (`SehatOrb.tsx`) used across every page. A teal gradient circle with a `hue-rotate` CSS animation that cycles through the full health spectrum — teal → cyan → indigo → purple → pink → red → warm magenta → back to teal over 10 seconds. The orb is the same everywhere: main page header, sub-page headers (via AppShell), period health page, and a large hero version on the welcome screen.

**Why hue-rotate:** Earlier attempts used `background-position` animation on gradients — the color shift was barely visible. `filter: hue-rotate()` is GPU-accelerated and creates dramatic, obvious color shifts across the entire element. The large hero orb also has a separate blurred glow div that shifts in sync.

### AppShell — Shared Navigation Shell
New `AppShell.tsx` component wrapping all sub-pages (dashboard, history, reports, analytics). Provides:
- Sticky glass top bar with SehatOrb, gradient "Sehat" text, page title
- Mobile bottom nav with 5 tabs (Home, History, Dashboard, Reports, Period Health), active state indicators
- Consistent `max-w-5xl` content area with mobile safe-area padding

### Design Token System
Centralized card styling via CSS custom properties and utility classes in `globals.css`:
- `.card-clinical` — unified card with `backdrop-blur-sm`, token-based shadows, hover elevation
- `.section-label` — `11px uppercase tracking-wider` headers used in TriageResult and sub-pages
- `.metric-value` — `tabular-nums` KPI values (fixed dashboard vs analytics inconsistency)
- `.skeleton` — shimmer loading placeholders replacing spinner-based loading states
- `.stagger-children` — CSS stagger animation (60ms intervals) for lists
- `.divider-section` — subtle token-based section dividers

### TriageResult — Visual Hierarchy Overhaul
- Severity badge: emoji icons replaced with professional colored dots
- Header row: severity + urgency timeframe in horizontal `flex justify-between` layout
- "Where to go" elevated to a card-within-card (`bg-white/60 backdrop-blur-sm`) with `text-xl font-bold`
- Emergency call buttons moved inside the primary action card
- Section dividers between first aid, red flags, and do-not sections

### ThinkingDisplay Enhancements
- Progress bar: purple-to-indigo gradient fill showing step completion percentage
- Raw reasoning view: dark terminal aesthetic (`bg-gray-900`, `text-gray-300` monospace)

### Welcome Hero Redesign
- Large SehatOrb (w-28) with blurred glow halo
- Bigger greeting (`text-3xl`), improved subtitle contrast
- "Tap the mic or type below" quick-start hint with mic icon

### Additional Polish
- Chat loading: skeleton chat bubble replacing shimmer bars
- TextInput: uses `.input-active-glow` utility (enhanced ring + shadow)
- FollowUpOptions: `bg-white/80`, `shadow-sm`, `hover:shadow-md`, `stagger-children`
- EmergencyBanner: `.emergency-shake` on mount + `ring-4 ring-white/30` on call button
- ConversationThread: `stagger-children` entry animation
- DoctorSummary: `card-clinical` card style
- Voice mode icon: waveform bars replacing speaker icon
- Glass effects: enhanced `backdrop-filter: blur(20px) saturate(1.2)` on headers and inputs
- All sub-pages: consistent card styling, skeleton loading, branded empty states

**Files changed:** 17 (15 modified + 2 new components)

---

## v0.9 — Voice-First Hero + Layout Consistency (Feb 13)

**What changed:**

### Voice-First Welcome Redesign
Completely rebuilt the main page welcome hero around a voice-first interaction model:
- **Giant voice CTA** at center with ambient glow blobs (teal/cyan/indigo radial gradients, soft floating animation) — mirrors the voice-mode ambient effect but localized and subtle
- **Waveform icon** replacing the microphone — five animated bars conveying audio/voice visually
- **Quick-start symptom chips** per language ("सिर में दर्द है", "Headache", "தலைவலி") — tap to instantly start a triage without typing
- **Compact language pills** at top of hero — pick language first, content updates below
- **Stable vertical layout** using `justify-between` with `min-h-[3rem]` on variable-length subtitle text — voice button stays perfectly centered regardless of language selection

### Full-Width Layout Fix
The main page had visible sharp edges on both sides — the `max-w-5xl` container was clipping gradient blobs and glass effects at its boundary. Restructured the entire page layout to match AppShell's full-width pattern:
- Outer `div` is full viewport width with `overflow-hidden`
- Header and input area span full width (glass effects edge-to-edge)
- Only inner content constrained to `max-w-5xl mx-auto`
- Background effects (gradient blobs, hero-mesh) positioned in the full-width container

### Period Health → AppShell
The period health page had its own custom `NavHeader` and no mobile bottom nav. Migrated to use `AppShell` for consistency:
- Standard header with SehatOrb branding and navigation
- Mobile bottom nav (5 tabs) now present on all sub-pages
- Language pills moved inline into page content
- All early return states (loading, sign-in, error) also wrapped with AppShell

### Placeholder & Spacing Polish
- Shortened all 7 language placeholders to concise form (e.g., "Describe your symptoms..." instead of "Tell us how you're feeling. Describe your symptoms...") — prevents text truncation on mobile with action buttons
- Added breathing room between "Tap to talk" text and quick-start chips

**Files changed:** 4 (`page.tsx`, `globals.css`, `period-health/page.tsx`, `constants.ts`)

---

## v1.0 — Preferred Language + Analytics (Feb 13)

**What changed:**

### Preferred Language in Profile
Users can now set their preferred language in their health profile. The entire site loads in that language for returning users — no more defaulting to Hindi every time.

- **Language picker in ProfileForm**: 7 pill buttons with native script labels (हिन्दी, English, தமிழ், తెలుగు, मराठी, ಕನ್ನಡ, বাংলা), same visual style as gender selector
- **Dual persistence**: saved to Supabase (via `/api/profile`) AND cached in `localStorage('sehat_preferred_language')` for instant load without API roundtrip
- **Main page mount**: reads localStorage first; if empty (first visit on device), fetches `/api/profile` to get saved preference, caches it, and applies
- **ProfileForm load sync**: when the profile form fetches existing data, it also writes `preferred_language` to localStorage — so even opening the form once populates the cache
- **Profile close callback**: if user changes language in profile, the main page immediately switches without page reload
- **Triage agent context**: `buildPatientContext()` now includes `Preferred language: X` in the patient context sent to Claude

**Infrastructure was already 99% done** — the `preferred_language` column existed in Supabase, the TypeScript type had the field, and the API route accepted it. The missing pieces were: UI picker, localStorage caching, mount-time loading, and cross-page sync.

**Period health fix**: page was reading from stale `sehat_language` localStorage key instead of `sehat_preferred_language`.

### Vercel Web Analytics
Added `@vercel/analytics` for production usage tracking.

**Files changed:** 4 (`ProfileForm.tsx`, `page.tsx`, `period-health/page.tsx`, `triage-agent.ts`, `layout.tsx`)

---

## Architecture Evolution

```
v0.1: Text → Claude → Free text response
v0.2: Text → Claude (8-step reasoning) → Structured JSON → Severity card
v0.3: Voice → Sarvam STT → Claude → JSON → Card + Sarvam TTS
v0.4: Voice loop → Emergency bypass → Claude → TTS → Auto-listen
v0.5: Full platform (history, reports, dashboard, period health, documents)
v0.6: Security hardened, clinically audited, voice optimized
v0.7: 13 agentic tools (read+write), interactive follow-up pills, profile-aware personalization
v0.8: Clinical UI overhaul — SehatOrb, AppShell, design tokens, visual hierarchy
v0.9: Voice-first hero, full-width layout fix, period health → AppShell
v1.0: Preferred language in profile, Vercel analytics, cross-page language sync
```

## Prompt Evolution

The system prompt went through 6 major revisions:

| Version | Length | Key Change |
|---------|--------|-----------|
| v1 | ~200 words | Basic "you are a medical assistant" |
| v2 | ~1,500 words | Added 8-step clinical reasoning framework |
| v3 | ~2,500 words | Added multilingual support, JSON schema |
| v4 | ~3,000 words | Added dangerous home remedies, Step 0 query classification |
| v5 | ~3,500 words | Added script-specific language anchoring, emoji ban |
| v6 | ~4,200 words | Added sepsis, diabetic, tropical, environmental red flags, expanded thresholds |
| v7 | ~4,800 words | Added follow_up_options schema, action tools section, tool call strategy |

## Key Metrics

- **69 commits** over 4 days
- **~12,800 lines** of TypeScript
- **69 source files** across 12 API routes, 21 components, 7 pages
- **13 agentic tools** (10 read + 3 write) with multi-turn tool-use loop
- **7 Indian languages** with code-mixing support
- **200+ emergency keywords** across all languages
- **Clinical framework** equivalent to ESI/MTS triage systems
- **Zero external UI libraries** — custom components throughout
- **Sub-50ms** emergency detection latency

## What I'd Do With More Time

1. **Streaming STT** — start triage while user is still speaking
2. **Chunked TTS playback** — play first audio chunk immediately while rest streams
3. **Offline mode** with service worker — cache triage results, sync when online
4. **Location-based facility finding** — GPS to nearest PHC/hospital
5. **Community health worker dashboard** — aggregate anonymized triage data for public health insights
6. **WhatsApp integration** — reach users who don't install apps
