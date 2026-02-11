import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client — only created if env vars are configured.
 * All callers should null-check before use.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Server-side client with service role key for admin operations */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/*
SQL schema — run this in Supabase SQL editor:

-- User profiles (linked to Clerk user ID)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  pre_existing_conditions TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'hi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage session history
CREATE TABLE IF NOT EXISTS triage_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  language TEXT NOT NULL,
  severity TEXT,
  confidence REAL,
  symptoms TEXT[] DEFAULT '{}',
  input_mode TEXT DEFAULT 'text',
  reasoning_summary TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical uploads (reports, prescriptions)
CREATE TABLE IF NOT EXISTS medical_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('report', 'prescription', 'other')),
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_uploads ENABLE ROW LEVEL SECURITY;

-- Storage bucket for medical files
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-files', 'medical-files', false)
ON CONFLICT DO NOTHING;

-- RLS policies (users can only access their own data)
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims')::json->>'sub');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims')::json->>'sub');
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (true);
*/
