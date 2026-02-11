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

export async function GET() {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Sign in to view dashboard' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Fetch all user sessions
  const { data: sessions, error } = await supabase
    .from('triage_sessions')
    .select('session_id, severity, confidence, symptoms, is_emergency, language, input_mode, created_at')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const allSessions = sessions || [];
  const total = allSessions.length;

  // Severity distribution
  const severityDist: Record<string, number> = { emergency: 0, urgent: 0, routine: 0, self_care: 0 };
  let emergencyCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  const symptomFreq: Record<string, number> = {};

  for (const s of allSessions) {
    if (s.severity && severityDist[s.severity] !== undefined) {
      severityDist[s.severity]++;
    }
    if (s.is_emergency) emergencyCount++;
    if (typeof s.confidence === 'number' && !isNaN(s.confidence)) {
      confidenceSum += s.confidence;
      confidenceCount++;
    }
    if (s.symptoms) {
      for (const sym of s.symptoms) {
        const key = sym.toLowerCase().trim();
        if (key) symptomFreq[key] = (symptomFreq[key] || 0) + 1;
      }
    }
  }

  // Top symptoms
  const topSymptoms = Object.entries(symptomFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symptom, count]) => ({ symptom, count }));

  // Timeline: group sessions by date (last 30 days)
  interface DayBucket { emergency: number; urgent: number; routine: number; self_care: number }
  const timeline: Array<{ date: string } & DayBucket> = [];
  const dateMap = new Map<string, DayBucket>();

  for (const s of allSessions) {
    const dateStr = new Date(s.created_at).toISOString().split('T')[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { emergency: 0, urgent: 0, routine: 0, self_care: 0 });
    }
    const bucket = dateMap.get(dateStr)!;
    if (s.severity && s.severity in bucket) {
      bucket[s.severity as keyof DayBucket]++;
    }
  }

  // Sort dates and limit to last 30
  const sortedDates = [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30);

  for (const [date, counts] of sortedDates) {
    timeline.push({ date, ...counts });
  }

  // Trend analysis: compare last 7 days vs previous 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentWeek = allSessions.filter(s => new Date(s.created_at) >= sevenDaysAgo);
  const prevWeek = allSessions.filter(s => {
    const d = new Date(s.created_at);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  const trendDirection = (recent: number, prev: number): 'up' | 'down' | 'stable' => {
    if (prev === 0 && recent === 0) return 'stable';
    if (prev === 0) return 'up';
    const change = ((recent - prev) / prev) * 100;
    if (change > 15) return 'up';
    if (change < -15) return 'down';
    return 'stable';
  };

  const recentEmergencies = recentWeek.filter(s => s.is_emergency).length;
  const prevEmergencies = prevWeek.filter(s => s.is_emergency).length;

  return Response.json({
    total,
    emergencyCount,
    avgConfidence: confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : 0,
    severityDistribution: severityDist,
    topSymptoms,
    timeline,
    trends: {
      sessions: trendDirection(recentWeek.length, prevWeek.length),
      emergencies: trendDirection(recentEmergencies, prevEmergencies),
      sessionsThisWeek: recentWeek.length,
      sessionsPrevWeek: prevWeek.length,
    },
  });
}
