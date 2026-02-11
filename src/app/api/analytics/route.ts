import { telemetry } from '@/lib/telemetry';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getClerkUserId(): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  const adminIds = (process.env.ADMIN_CLERK_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  return adminIds.includes(userId);
}

export async function GET() {
  const userId = await getClerkUserId();
  const admin = isAdmin(userId);

  // Try Supabase-backed metrics first (persistent across deploys)
  const supabase = getServiceClient();
  if (supabase) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      // Fetch recent telemetry events (last 24h)
      const { data: events } = await supabase
        .from('telemetry_events')
        .select('*')
        .gte('created_at', last24h)
        .order('created_at', { ascending: false });

      const allEvents = events || [];
      const triageEvents = allEvents.filter(e => e.event_type === 'triage');
      const sttEvents = allEvents.filter(e => e.event_type === 'transcribe');
      const ttsEvents = allEvents.filter(e => e.event_type === 'tts');
      const recentHour = triageEvents.filter(e => new Date(e.created_at) > new Date(last1h));

      // Total counts (all-time)
      const { count: totalTriages } = await supabase
        .from('telemetry_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'triage');

      const { count: totalEmergencies } = await supabase
        .from('telemetry_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'triage')
        .eq('is_emergency', true);

      const { count: totalVoice } = await supabase
        .from('telemetry_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'transcribe');

      const completed = triageEvents.filter(e => !e.had_error && e.severity);
      const voiceCount = triageEvents.filter(e => e.input_mode !== 'text').length;

      // Query triage_sessions for follow-up and non-medical rates (last 24h)
      const { data: recentSessions } = await supabase
        .from('triage_sessions')
        .select('follow_up_count, is_medical_query')
        .gte('created_at', last24h);
      const sessionsArr = recentSessions || [];

      // Unique languages
      const langsUsed = new Set(triageEvents.map(e => e.language).filter(Boolean));

      const avg = (nums: number[]) => nums.length === 0 ? 0 : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
      const p95 = (nums: number[]) => {
        if (nums.length === 0) return 0;
        const sorted = [...nums].sort((a, b) => a - b);
        const idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
        return sorted[idx];
      };

      const metrics = {
        totalTriages: totalTriages || 0,
        totalEmergenciesDetected: totalEmergencies || 0,
        totalVoiceSessions: totalVoice || 0,
        languagesServed: langsUsed.size,
        voiceUsagePercent: triageEvents.length > 0
          ? Math.round((voiceCount / triageEvents.length) * 100) : 0,
        uptimeMs: 0, // Not meaningful for persistent store

        triagesLast24h: triageEvents.length,
        emergenciesLast24h: triageEvents.filter(e => e.is_emergency).length,
        triagesLastHour: recentHour.length,

        severityDistribution: {
          emergency: completed.filter(e => e.severity === 'emergency').length,
          urgent: completed.filter(e => e.severity === 'urgent').length,
          routine: completed.filter(e => e.severity === 'routine').length,
          self_care: completed.filter(e => e.severity === 'self_care').length,
        },

        languageDistribution: (['hi', 'ta', 'te', 'mr', 'kn', 'bn', 'en']).reduce(
          (acc, lang) => {
            acc[lang] = triageEvents.filter(e => e.language === lang).length;
            return acc;
          },
          {} as Record<string, number>
        ),

        inputModeDistribution: {
          text: triageEvents.filter(e => e.input_mode === 'text').length,
          voice: triageEvents.filter(e => e.input_mode === 'voice').length,
          voice_conversation: triageEvents.filter(e => e.input_mode === 'voice_conversation').length,
        },

        performance: {
          avgTriageMs: avg(triageEvents.filter(e => !e.had_error && e.latency_ms).map(e => e.latency_ms)),
          p95TriageMs: p95(triageEvents.filter(e => !e.had_error && e.latency_ms).map(e => e.latency_ms)),
          avgSTTMs: avg(sttEvents.filter(e => e.success && e.latency_ms).map(e => e.latency_ms)),
          avgTTSMs: avg(ttsEvents.filter(e => e.success && e.latency_ms).map(e => e.latency_ms)),
        },

        quality: {
          avgConfidence: avg(completed.filter(e => typeof e.confidence === 'number' && !isNaN(e.confidence)).map(e => Math.round(e.confidence * 100))),
          followUpRate: sessionsArr.length > 0
            ? Math.round((sessionsArr.filter(s => s.follow_up_count > 0).length / sessionsArr.length) * 100) : 0,
          nonMedicalRate: sessionsArr.length > 0
            ? Math.round((sessionsArr.filter(s => !s.is_medical_query).length / sessionsArr.length) * 100) : 0,
        },

        voicePipeline: {
          sttSuccessRate: sttEvents.length > 0
            ? Math.round((sttEvents.filter(e => e.success).length / sttEvents.length) * 100) : 0,
          ttsSuccessRate: ttsEvents.length > 0
            ? Math.round((ttsEvents.filter(e => e.success).length / ttsEvents.length) * 100) : 0,
          totalSTTRequests: sttEvents.length,
          totalTTSRequests: ttsEvents.length,
        },

        errors: {
          triageErrorRate: triageEvents.length > 0
            ? Math.round((triageEvents.filter(e => e.had_error).length / triageEvents.length) * 100) : 0,
          triageErrors: triageEvents.filter(e => e.had_error).length,
          sttErrors: sttEvents.filter(e => !e.success).length,
          ttsErrors: ttsEvents.filter(e => !e.success).length,
        },

        // Only show recent activity to admins
        recentActivity: admin ? triageEvents.slice(0, 20).map(e => ({
          timestamp: new Date(e.created_at).getTime(),
          language: e.language,
          severity: e.severity,
          isEmergency: e.is_emergency,
          inputMode: e.input_mode,
          latencyMs: e.latency_ms,
          isMedicalQuery: true,
        })) : [],

        isAdmin: admin,
        dataSource: 'supabase',
      };

      return Response.json(metrics, {
        headers: { 'Cache-Control': 'no-cache' },
      });
    } catch (err) {
      console.error('[analytics] Supabase query failed, falling back to in-memory:', err);
    }
  }

  // Fallback to in-memory telemetry
  const metrics = telemetry.getMetrics();

  return Response.json(
    {
      ...metrics,
      // Strip recent activity for non-admins
      recentActivity: admin ? metrics.recentActivity : [],
      isAdmin: admin,
      dataSource: 'memory',
    },
    {
      headers: { 'Cache-Control': 'no-cache' },
    }
  );
}
