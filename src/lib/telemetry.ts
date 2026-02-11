/**
 * Sehat Telemetry — Privacy-preserving public health analytics.
 *
 * Design principles:
 * 1. ZERO PII — no raw text, no symptoms, no identifiers
 * 2. Aggregate only — individual events exist only for recent activity feed
 * 3. In-memory — resets on deploy (use Redis/Postgres in production)
 * 4. Every metric answers: "Are we reaching the people who need this most?"
 */

import { Severity, Language } from '@/types';

export type InputMode = 'text' | 'voice' | 'voice_conversation';

export interface TriageEvent {
  timestamp: number;
  language: Language;
  inputMode: InputMode;
  severity: Severity | null;
  confidence: number | null;
  isEmergency: boolean;
  isMedicalQuery: boolean;
  followUpCount: number;
  latencyMs: number;
  hadError: boolean;
}

export interface TranscribeEvent {
  timestamp: number;
  language: string;
  latencyMs: number;
  success: boolean;
}

export interface TTSEvent {
  timestamp: number;
  language: string;
  textLength: number;
  latencyMs: number;
  success: boolean;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function p95(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

class TelemetryStore {
  private triageEvents: TriageEvent[] = [];
  private transcribeEvents: TranscribeEvent[] = [];
  private ttsEvents: TTSEvent[] = [];
  private readonly maxEvents = 10000;
  private readonly startTime = Date.now();

  recordTriage(event: TriageEvent) {
    this.triageEvents.push(event);
    if (this.triageEvents.length > this.maxEvents) {
      this.triageEvents = this.triageEvents.slice(-this.maxEvents);
    }
  }

  recordTranscribe(event: TranscribeEvent) {
    this.transcribeEvents.push(event);
    if (this.transcribeEvents.length > this.maxEvents) {
      this.transcribeEvents = this.transcribeEvents.slice(-this.maxEvents);
    }
  }

  recordTTS(event: TTSEvent) {
    this.ttsEvents.push(event);
    if (this.ttsEvents.length > this.maxEvents) {
      this.ttsEvents = this.ttsEvents.slice(-this.maxEvents);
    }
  }

  getMetrics() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;

    const recent = this.triageEvents.filter(e => e.timestamp > last24h);
    const recentSTT = this.transcribeEvents.filter(e => e.timestamp > last24h);
    const recentTTS = this.ttsEvents.filter(e => e.timestamp > last24h);
    const completed = recent.filter(e => !e.hadError && e.severity !== null);

    // Unique languages actually used
    const langsUsed = new Set(recent.map(e => e.language));

    // Voice usage (voice + voice_conversation)
    const voiceCount = recent.filter(e => e.inputMode !== 'text').length;

    return {
      // ── Impact KPIs ──
      totalTriages: this.triageEvents.length,
      totalEmergenciesDetected: this.triageEvents.filter(e => e.isEmergency).length,
      totalVoiceSessions: this.transcribeEvents.length,
      languagesServed: langsUsed.size,
      voiceUsagePercent: recent.length > 0
        ? Math.round((voiceCount / recent.length) * 100) : 0,
      uptimeMs: now - this.startTime,

      // ── Last 24h ──
      triagesLast24h: recent.length,
      emergenciesLast24h: recent.filter(e => e.isEmergency).length,
      triagesLastHour: this.triageEvents.filter(e => e.timestamp > last1h).length,

      // ── Severity Distribution (last 24h) ──
      severityDistribution: {
        emergency: completed.filter(e => e.severity === 'emergency').length,
        urgent: completed.filter(e => e.severity === 'urgent').length,
        routine: completed.filter(e => e.severity === 'routine').length,
        self_care: completed.filter(e => e.severity === 'self_care').length,
      },

      // ── Language Distribution (last 24h) ──
      languageDistribution: (['hi', 'ta', 'te', 'mr', 'kn', 'bn', 'en'] as Language[]).reduce(
        (acc, lang) => {
          acc[lang] = recent.filter(e => e.language === lang).length;
          return acc;
        },
        {} as Record<Language, number>
      ),

      // ── Input Mode (last 24h) ──
      inputModeDistribution: {
        text: recent.filter(e => e.inputMode === 'text').length,
        voice: recent.filter(e => e.inputMode === 'voice').length,
        voice_conversation: recent.filter(e => e.inputMode === 'voice_conversation').length,
      },

      // ── Performance (last 24h) ──
      performance: {
        avgTriageMs: avg(recent.filter(e => !e.hadError).map(e => e.latencyMs)),
        p95TriageMs: p95(recent.filter(e => !e.hadError).map(e => e.latencyMs)),
        avgSTTMs: avg(recentSTT.filter(e => e.success).map(e => e.latencyMs)),
        avgTTSMs: avg(recentTTS.filter(e => e.success).map(e => e.latencyMs)),
      },

      // ── Quality (last 24h) ──
      quality: {
        avgConfidence: avg(completed.filter(e => e.confidence !== null).map(e => Math.round(e.confidence! * 100))),
        followUpRate: recent.length > 0
          ? Math.round((recent.filter(e => e.followUpCount > 0).length / recent.length) * 100) : 0,
        nonMedicalRate: recent.length > 0
          ? Math.round((recent.filter(e => !e.isMedicalQuery).length / recent.length) * 100) : 0,
      },

      // ── Voice Pipeline (last 24h) ──
      voicePipeline: {
        sttSuccessRate: recentSTT.length > 0
          ? Math.round((recentSTT.filter(e => e.success).length / recentSTT.length) * 100) : 0,
        ttsSuccessRate: recentTTS.length > 0
          ? Math.round((recentTTS.filter(e => e.success).length / recentTTS.length) * 100) : 0,
        totalSTTRequests: recentSTT.length,
        totalTTSRequests: recentTTS.length,
      },

      // ── Error Rates (last 24h) ──
      errors: {
        triageErrorRate: recent.length > 0
          ? Math.round((recent.filter(e => e.hadError).length / recent.length) * 100) : 0,
        triageErrors: recent.filter(e => e.hadError).length,
        sttErrors: recentSTT.filter(e => !e.success).length,
        ttsErrors: recentTTS.filter(e => !e.success).length,
      },

      // ── Recent Activity (last 20 events, no PII) ──
      recentActivity: this.triageEvents.slice(-20).map(e => ({
        timestamp: e.timestamp,
        language: e.language,
        severity: e.severity,
        isEmergency: e.isEmergency,
        inputMode: e.inputMode,
        latencyMs: e.latencyMs,
        isMedicalQuery: e.isMedicalQuery,
      })).reverse(),
    };
  }
}

// Singleton — survives across requests in the same Node.js process
// In serverless (Vercel), each cold start resets. Use external storage for production.
const globalForTelemetry = globalThis as unknown as { _sehatTelemetry?: TelemetryStore };
if (!globalForTelemetry._sehatTelemetry) {
  globalForTelemetry._sehatTelemetry = new TelemetryStore();
}
export const telemetry = globalForTelemetry._sehatTelemetry;
