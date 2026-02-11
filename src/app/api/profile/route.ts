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

export async function GET() {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ profile: data || null });
}

export async function POST(request: NextRequest) {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.json();
  const { age, gender, pre_existing_conditions, preferred_language } = body;

  const profileData = {
    clerk_user_id: userId,
    age: age || null,
    gender: gender || null,
    pre_existing_conditions: pre_existing_conditions || [],
    preferred_language: preferred_language || 'hi',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ profile: data });
}
