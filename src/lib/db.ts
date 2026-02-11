/**
 * Sehat DB layer — saves triage sessions & uploads to Supabase.
 * All writes are fire-and-forget (non-blocking, log errors only).
 * Falls back gracefully when Supabase is not configured.
 */

import { getServiceClient } from './supabase';

export interface TriageSessionRecord {
  session_id: string;
  clerk_user_id?: string | null;
  language: string;
  severity: string | null;
  confidence: number | null;
  symptoms: string[];
  input_mode: string;
  reasoning_summary?: string | null;
  is_emergency: boolean;
  is_medical_query: boolean;
  follow_up_count: number;
  latency_ms: number;
}

export interface MedicalUploadRecord {
  clerk_user_id?: string | null;
  session_id?: string | null;
  file_name: string;
  file_type: 'report' | 'prescription' | 'image' | 'other';
  mime_type: string;
  analysis: string;
  language: string;
}

export interface ConversationMessageRecord {
  session_id: string;
  clerk_user_id?: string | null;
  role: 'user' | 'assistant';
  content: string;
  language?: string | null;
  is_follow_up?: boolean;
}

export interface TriageResultRecord {
  session_id: string;
  clerk_user_id?: string | null;
  result_json: Record<string, unknown>;
  thinking_content?: string | null;
  language?: string | null;
}

export interface TelemetryEventRecord {
  event_type: 'triage' | 'transcribe' | 'tts';
  language?: string | null;
  input_mode?: string | null;
  severity?: string | null;
  confidence?: number | null;
  is_emergency?: boolean | null;
  latency_ms?: number | null;
  had_error?: boolean | null;
  text_length?: number | null;
  success?: boolean | null;
}

/**
 * Save a triage session to Supabase.
 * Non-blocking — errors are logged, not thrown.
 */
export function saveTriageSession(record: TriageSessionRecord): void {
  const supabase = getServiceClient();
  if (!supabase) return;

  supabase
    .from('triage_sessions')
    .insert(record)
    .then(({ error }) => {
      if (error) {
        console.error('[db] Failed to save triage session:', error.message);
      }
    });
}

/**
 * Save a medical upload analysis to Supabase.
 * Non-blocking — errors are logged, not thrown.
 */
export function saveMedicalUpload(record: MedicalUploadRecord): void {
  const supabase = getServiceClient();
  if (!supabase) return;

  supabase
    .from('medical_uploads')
    .insert(record)
    .then(({ error }) => {
      if (error) {
        console.error('[db] Failed to save medical upload:', error.message);
      }
    });
}

/**
 * Save a conversation message to Supabase.
 * Non-blocking — errors are logged, not thrown.
 */
export function saveConversationMessage(record: ConversationMessageRecord): void {
  const supabase = getServiceClient();
  if (!supabase) return;

  supabase
    .from('conversation_messages')
    .insert(record)
    .then(({ error }) => {
      if (error) {
        console.error('[db] Failed to save conversation message:', error.message);
      }
    });
}

/**
 * Save a triage result to Supabase (upsert on session_id).
 * Non-blocking — errors are logged, not thrown.
 */
export function saveTriageResult(record: TriageResultRecord): void {
  const supabase = getServiceClient();
  if (!supabase) return;

  supabase
    .from('triage_results')
    .upsert(record, { onConflict: 'session_id' })
    .then(({ error }) => {
      if (error) {
        console.error('[db] Failed to save triage result:', error.message);
      }
    });
}

/**
 * Save a telemetry event to Supabase.
 * Non-blocking — errors are logged, not thrown.
 */
export function saveTelemetryEvent(record: TelemetryEventRecord): void {
  const supabase = getServiceClient();
  if (!supabase) return;

  supabase
    .from('telemetry_events')
    .insert(record)
    .then(({ error }) => {
      if (error) {
        console.error('[db] Failed to save telemetry event:', error.message);
      }
    });
}
