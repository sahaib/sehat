import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { savePeriodCycle } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

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

async function getUserGender(userId: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('gender')
    .eq('clerk_user_id', userId)
    .single();
  return data?.gender || null;
}

// GET — fetch user's period cycles + predictions + gender context
export async function GET(request: NextRequest) {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Sign in required' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Fetch gender in parallel with cycles
  const [gender, cyclesResult] = await Promise.all([
    getUserGender(userId),
    supabase
      .from('period_cycles')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('cycle_start', { ascending: false })
      .limit(24),
  ]);

  if (cyclesResult.error) {
    return Response.json({ error: cyclesResult.error.message }, { status: 500 });
  }

  const allCycles = cyclesResult.data || [];

  // Compute predictions
  let avgCycleLength = 28; // default
  let avgPeriodLength = 5;
  let nextPeriodDate: string | null = null;

  const cycleLengths = allCycles
    .filter(c => typeof c.cycle_length === 'number' && c.cycle_length > 0)
    .map(c => c.cycle_length as number);

  const periodLengths = allCycles
    .filter(c => typeof c.period_length === 'number' && c.period_length > 0)
    .map(c => c.period_length as number);

  if (cycleLengths.length > 0) {
    avgCycleLength = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
  }
  if (periodLengths.length > 0) {
    avgPeriodLength = Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length);
  }

  // Predict next period from most recent cycle start
  if (allCycles.length > 0) {
    const lastStart = new Date(allCycles[0].cycle_start);
    const predicted = new Date(lastStart.getTime() + avgCycleLength * 24 * 60 * 60 * 1000);
    nextPeriodDate = predicted.toISOString().split('T')[0];
  }

  // Check if notification is needed (period expected within 3 days or overdue)
  let notification: string | null = null;
  if (nextPeriodDate) {
    const now = new Date();
    const nextDate = new Date(nextPeriodDate);
    const diffDays = Math.floor((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      notification = `Your period may be ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} late. This is normal, but track any changes.`;
    } else if (diffDays <= 3) {
      notification = `Your period is expected in ${diffDays} day${diffDays !== 1 ? 's' : ''}. Stay prepared!`;
    }
  }

  return Response.json({
    gender,
    cycles: allCycles,
    predictions: {
      avgCycleLength,
      avgPeriodLength,
      nextPeriodDate,
      notification,
    },
  });
}

// POST — log a new cycle or ask AI for insights
export async function POST(request: NextRequest) {
  const userId = await getClerkUserId();
  if (!userId) {
    return Response.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json();

  // AI Q&A mode
  if (body.action === 'ask') {
    return handleAIQuestion(body.question, body.language || 'en', userId, body.context || 'self');
  }

  // Log cycle
  if (body.action === 'log') {
    const { cycle_start, cycle_end, period_length, flow_level, symptoms, mood, notes } = body;

    if (!cycle_start) {
      return Response.json({ error: 'cycle_start is required' }, { status: 400 });
    }

    // Calculate cycle_length from previous cycle
    const supabase = getServiceClient();
    let cycleLength: number | null = null;

    if (supabase) {
      const { data: prev } = await supabase
        .from('period_cycles')
        .select('cycle_start')
        .eq('clerk_user_id', userId)
        .order('cycle_start', { ascending: false })
        .limit(1);

      if (prev && prev.length > 0) {
        const prevStart = new Date(prev[0].cycle_start);
        const thisStart = new Date(cycle_start);
        cycleLength = Math.round((thisStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
        if (cycleLength < 1 || cycleLength > 90) cycleLength = null;
      }
    }

    savePeriodCycle({
      clerk_user_id: userId,
      cycle_start,
      cycle_end: cycle_end || null,
      period_length: period_length || null,
      cycle_length: cycleLength,
      flow_level: flow_level || null,
      symptoms: symptoms || [],
      mood: mood || null,
      notes: notes || null,
    });

    return Response.json({ success: true, cycle_length: cycleLength });
  }

  // Delete cycle
  if (body.action === 'delete' && body.id) {
    const supabase = getServiceClient();
    if (supabase) {
      await supabase
        .from('period_cycles')
        .delete()
        .eq('id', body.id)
        .eq('clerk_user_id', userId);
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

// AI-powered menstrual health Q&A
async function handleAIQuestion(question: string, language: string, _userId: string, context: string) {
  if (!question?.trim()) {
    return Response.json({ error: 'Question is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI not configured' }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  const LANG_MAP: Record<string, string> = {
    hi: 'Hindi', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
    kn: 'Kannada', bn: 'Bengali', en: 'English',
  };
  const langName = LANG_MAP[language] || 'the user\'s language';

  const isAlly = context === 'ally';

  const systemPrompt = isAlly
    ? `You are Sehat's menstrual health education companion — a warm, knowledgeable AI assistant helping men and boys in India understand menstrual health so they can support women and girls in their families and communities.

Your role:
- Educate about menstrual health in simple, respectful, non-awkward language
- Help men understand what periods are, why they happen, and why they matter for women's health
- Teach practical ways to be supportive — buying pads without embarrassment, understanding mood changes, not treating it as "dirty" or taboo
- Explain common conditions (PCOS, cramps, irregular cycles) so they can recognize when a family member needs medical help
- Challenge myths and taboos (e.g., "women shouldn't enter kitchen during periods" is a myth, not science)
- Discuss when to encourage someone to see a doctor (very heavy bleeding, severe pain, missed periods for 3+ months)

Tone:
- Factual, compassionate, never preachy or condescending
- Normalize the conversation — menstruation is biology, not shame
- Use phrases like "your sister/wife/mother/daughter" to make it relatable
- Acknowledge that many men never received this education and that's okay — learning now is what matters

Safety rules:
- NEVER diagnose conditions. Say "this could be related to..." and recommend seeing a doctor.
- NEVER recommend specific medicines or dosages.
- ALWAYS encourage consulting a healthcare provider for persistent or severe symptoms.
- Be culturally sensitive — many Indian families don't discuss this openly.

Respond in ${langName}. Keep answers concise (2-4 paragraphs max). Use simple words.
If the user's message is not about menstrual/reproductive health, gently redirect them to the main Sehat triage for other health concerns.`
    : `You are Sehat's menstrual health companion — a warm, knowledgeable AI assistant focused on period health education for women and girls in India, especially in rural areas.

Your role:
- Educate about menstrual health in simple, culturally sensitive language
- Answer questions about periods, cycle tracking, symptoms, hygiene, nutrition
- Break taboos around menstruation with factual, compassionate information
- Flag when symptoms need medical attention (e.g., very heavy bleeding, severe pain, missed periods for 3+ months)
- Suggest home remedies that are safe AND scientifically supported
- Discuss topics like PCOS, anemia, puberty, menopause when asked

Safety rules:
- NEVER diagnose conditions. Say "this could be related to..." and recommend seeing a doctor.
- NEVER recommend specific medicines or dosages.
- ALWAYS encourage consulting a healthcare provider for persistent or severe symptoms.
- Be sensitive to cultural context — many users may be learning about this for the first time.

Respond in ${langName}. Keep answers concise (2-4 paragraphs max). Use simple words.
If the user's message is not about menstrual/reproductive health, gently redirect them to the main Sehat triage for other health concerns.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return Response.json({ answer: text });
  } catch (err) {
    console.error('[period-tracker] AI error:', err);
    return Response.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}
