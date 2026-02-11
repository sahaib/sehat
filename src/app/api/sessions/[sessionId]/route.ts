import { NextRequest } from 'next/server';
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Sign in to view session details' }, { status: 401 });
  }

  const { sessionId } = await params;

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('triage_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('clerk_user_id', userId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  // Fetch messages, result, in parallel
  const [messagesRes, resultRes] = await Promise.all([
    supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('triage_results')
      .select('*')
      .eq('session_id', sessionId)
      .single(),
  ]);

  return Response.json({
    session,
    messages: messagesRes.data || [],
    result: resultRes.data?.result_json || null,
    thinkingContent: resultRes.data?.thinking_content || null,
  });
}
