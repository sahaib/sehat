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
