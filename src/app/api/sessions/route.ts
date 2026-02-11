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

export async function GET(request: Request) {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Sign in to view your history' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Fetch user's triage sessions with their results
  const { data: sessions, error, count } = await supabase
    .from('triage_sessions')
    .select('session_id, language, severity, confidence, symptoms, input_mode, reasoning_summary, is_emergency, created_at', { count: 'exact' })
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    sessions: sessions || [],
    total: count || 0,
    page,
    limit,
  });
}
