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
    return Response.json({ error: 'Sign in to view reports' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Fetch triage results and medical uploads in parallel
  const [triageRes, uploadsRes] = await Promise.all([
    supabase
      .from('triage_results')
      .select('session_id, result_json, language, created_at')
      .eq('clerk_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('medical_uploads')
      .select('id, file_name, file_type, analysis, language, created_at')
      .eq('clerk_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return Response.json({
    triageReports: triageRes.data || [],
    documentAnalyses: uploadsRes.data || [],
  });
}
