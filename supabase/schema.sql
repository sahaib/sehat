-- ============================================================
-- Sehat (सेहत) — Supabase Schema
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- ─── 1. User Profiles ───────────────────────────────────────
-- Stores optional health profile linked to Clerk auth.
-- All fields optional — users can skip or fill later.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  name TEXT,
  age INTEGER CHECK (age > 0 AND age < 150),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  pre_existing_conditions TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'hi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by Clerk user
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user ON profiles(clerk_user_id);

-- ─── 2. Triage Sessions ─────────────────────────────────────
-- Every triage interaction is logged (zero PII in symptoms —
-- only the model-identified symptom names, not raw user text).
-- Anonymous users have null clerk_user_id.
CREATE TABLE IF NOT EXISTS triage_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,    -- frontend-generated session ID (unique for upsert)
  clerk_user_id TEXT,                 -- nullable for anonymous users
  language TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('emergency', 'urgent', 'routine', 'self_care')),
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  symptoms TEXT[] DEFAULT '{}',
  input_mode TEXT DEFAULT 'text' CHECK (input_mode IN ('text', 'voice', 'voice_conversation')),
  reasoning_summary TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_medical_query BOOLEAN DEFAULT TRUE,
  follow_up_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user history lookups
CREATE INDEX IF NOT EXISTS idx_triage_clerk_user ON triage_sessions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_triage_session ON triage_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_triage_created ON triage_sessions(created_at DESC);

-- ─── 3. Medical Uploads ─────────────────────────────────────
-- Stores analysis results from uploaded medical documents.
-- We do NOT store the actual file — only the AI analysis text.
CREATE TABLE IF NOT EXISTS medical_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT,                 -- nullable for anonymous users
  session_id TEXT,                    -- link to triage session context
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('report', 'prescription', 'image', 'other')),
  mime_type TEXT,
  analysis TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_clerk_user ON medical_uploads(clerk_user_id);

-- ─── 4. Row Level Security ──────────────────────────────────
-- Enable RLS on all tables. API routes use service_role key
-- which bypasses RLS, but this protects against direct access.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_uploads ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (true);  -- service_role handles auth

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (true);

-- Triage: insert-only from API, users read their own
CREATE POLICY "triage_insert" ON triage_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "triage_select_own" ON triage_sessions
  FOR SELECT USING (true);

-- Uploads: insert-only from API, users read their own
CREATE POLICY "uploads_insert" ON medical_uploads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "uploads_select_own" ON medical_uploads
  FOR SELECT USING (true);

-- ─── 5. Conversation Messages ──────────────────────────────
-- Individual chat messages for replaying past sessions.
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  clerk_user_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  language TEXT,
  is_follow_up BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_msg_session ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_msg_clerk_user ON conversation_messages(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_msg_created ON conversation_messages(created_at DESC);

-- ─── 6. Triage Results ────────────────────────────────────
-- Full JSON result for re-rendering past triage outcomes.
CREATE TABLE IF NOT EXISTS triage_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  clerk_user_id TEXT,
  result_json JSONB NOT NULL,
  thinking_content TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_results_session ON triage_results(session_id);
CREATE INDEX IF NOT EXISTS idx_triage_results_clerk_user ON triage_results(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_triage_results_created ON triage_results(created_at DESC);

-- ─── 7. Telemetry Events ──────────────────────────────────
-- Persistent telemetry (replaces in-memory store across deploys).
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('triage', 'transcribe', 'tts')),
  language TEXT,
  input_mode TEXT,
  severity TEXT,
  confidence REAL,
  is_emergency BOOLEAN,
  latency_ms INTEGER,
  had_error BOOLEAN,
  text_length INTEGER,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);

-- RLS for new tables
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_msg_insert" ON conversation_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "conv_msg_select" ON conversation_messages
  FOR SELECT USING (true);

CREATE POLICY "triage_results_insert" ON triage_results
  FOR INSERT WITH CHECK (true);
CREATE POLICY "triage_results_select" ON triage_results
  FOR SELECT USING (true);

CREATE POLICY "telemetry_insert" ON telemetry_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "telemetry_select" ON telemetry_events
  FOR SELECT USING (true);

-- ─── 8. Period Health Tracking ────────────────────────────
-- AI-powered menstrual health companion for rural Indian women.
CREATE TABLE IF NOT EXISTS period_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  cycle_start DATE NOT NULL,
  cycle_end DATE,
  period_length INTEGER,       -- days of bleeding
  cycle_length INTEGER,        -- days between cycle starts
  flow_level TEXT CHECK (flow_level IN ('light', 'medium', 'heavy')),
  symptoms TEXT[] DEFAULT '{}',
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_period_clerk_user ON period_cycles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_period_start ON period_cycles(cycle_start DESC);

ALTER TABLE period_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "period_insert" ON period_cycles FOR INSERT WITH CHECK (true);
CREATE POLICY "period_select" ON period_cycles FOR SELECT USING (true);
CREATE POLICY "period_update" ON period_cycles FOR UPDATE USING (true);
CREATE POLICY "period_delete" ON period_cycles FOR DELETE USING (true);

-- ─── 9. Storage Bucket (optional) ───────────────────────────
-- Uncomment if you want to store original files in Supabase Storage:
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', false)
ON CONFLICT DO NOTHING;
