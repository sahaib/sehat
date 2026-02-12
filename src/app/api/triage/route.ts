import { NextRequest } from 'next/server';
import { detectEmergency } from '@/lib/emergency-detector';
import { streamTriage } from '@/lib/triage-agent';
import { TriageRequest, StreamEvent } from '@/types';
import { telemetry, InputMode, TriageEvent } from '@/lib/telemetry';
import { saveTriageSession, saveConversationMessage, saveTriageResult } from '@/lib/db';
import { validateLanguage, sanitizeMessage, sanitizeConversationHistory } from '@/lib/input-guard';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

async function getClerkUserId(): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Rate limit: 20 triage requests per IP per minute
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`triage:${ip}`, 20);
  if (!allowed) {
    return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const body: TriageRequest = await request.json();
    const { message, conversationHistory, sessionId: rawSessionId, inputMode } = body;
    const clerkUserId = await getClerkUserId();

    // Validate and sanitize inputs
    const language = validateLanguage(body.language);
    const { text: sanitizedMessage } = sanitizeMessage(message || '');
    const sanitizedHistory = sanitizeConversationHistory(conversationHistory);

    // Guarantee a unique session ID — never fall back to 'unknown' (causes UNIQUE collisions)
    const sessionId = rawSessionId || crypto.randomUUID();

    if (!sanitizedMessage) {
      return Response.json(
        { error: 'Message and language are required' },
        { status: 400 }
      );
    }

    // Server-side emergency detection (Layer 2)
    const emergencyCheck = detectEmergency(sanitizedMessage, language);

    const encoder = new TextEncoder();

    // Telemetry accumulator — filled as stream progresses
    const tel: TriageEvent = {
      timestamp: startTime,
      language,
      inputMode: (inputMode as InputMode) || 'text',
      severity: null,
      confidence: null,
      isEmergency: emergencyCheck.isEmergency,
      isMedicalQuery: true,
      followUpCount: sanitizedHistory.filter(m => m.isFollowUp).length,
      latencyMs: 0,
      hadError: false,
    };

    // DB record accumulator — captures result data for Supabase persistence
    let resultSymptoms: string[] = [];
    let resultReasoning: string | null = null;
    let thinkingAccumulator = '';
    let resultData: Record<string, unknown> | null = null;

    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          // If emergency detected, send emergency event immediately
          if (emergencyCheck.isEmergency) {
            send({ type: 'emergency', data: emergencyCheck });
          }

          // Save user message to DB (fire-and-forget)
          saveConversationMessage({
            session_id: sessionId,
            clerk_user_id: clerkUserId,
            role: 'user',
            content: sanitizedMessage,
            language,
            is_follow_up: sanitizedHistory.length > 0,
          });

          // Stream triage response from Claude
          for await (const event of streamTriage(
            sanitizedMessage,
            language,
            sanitizedHistory,
            (inputMode as 'text' | 'voice' | 'voice_conversation') || 'text'
          )) {
            send(event);

            // Capture thinking content for DB
            if (event.type === 'thinking') {
              thinkingAccumulator += event.content;
            }

            // Capture result metrics for telemetry + DB
            if (event.type === 'result') {
              tel.severity = event.data.severity;
              tel.confidence = event.data.confidence;
              tel.isMedicalQuery = event.data.is_medical_query !== false;
              resultSymptoms = event.data.symptoms_identified || [];
              resultReasoning = event.data.reasoning_summary || null;
              resultData = event.data as unknown as Record<string, unknown>;
            }

            // Save follow-up questions as assistant messages
            if (event.type === 'follow_up' || (event.type === 'result' && event.data.needs_follow_up && event.data.follow_up_question)) {
              const question = event.type === 'follow_up'
                ? (event as { type: 'follow_up'; question: string }).question
                : event.data.follow_up_question;
              if (question) {
                saveConversationMessage({
                  session_id: sessionId,
                  clerk_user_id: clerkUserId,
                  role: 'assistant',
                  content: question,
                  language,
                  is_follow_up: true,
                });
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          tel.latencyMs = Date.now() - startTime;
          telemetry.recordTriage(tel);

          // Persist to Supabase (fire-and-forget)
          if (tel.severity || tel.isEmergency) {
            saveTriageSession({
              session_id: sessionId,
              clerk_user_id: clerkUserId,
              language,
              severity: tel.severity || 'emergency',
              confidence: tel.confidence,
              symptoms: resultSymptoms,
              input_mode: (inputMode as string) || 'text',
              reasoning_summary: resultReasoning,
              is_emergency: tel.isEmergency,
              is_medical_query: tel.isMedicalQuery,
              follow_up_count: tel.followUpCount,
              latency_ms: tel.latencyMs,
            });

            // Save full result JSON for history replay
            if (resultData) {
              saveTriageResult({
                session_id: sessionId,
                clerk_user_id: clerkUserId,
                result_json: resultData,
                thinking_content: thinkingAccumulator || null,
                language,
              });
            }
          }

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unexpected error occurred';
          send({ type: 'error', message: errorMessage });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          tel.hadError = true;
          tel.latencyMs = Date.now() - startTime;
          telemetry.recordTriage(tel);

          // Persist error sessions too so they show in history
          saveTriageSession({
            session_id: sessionId,
            clerk_user_id: clerkUserId,
            language,
            severity: tel.severity || 'routine',
            confidence: tel.confidence,
            symptoms: resultSymptoms,
            input_mode: (inputMode as string) || 'text',
            reasoning_summary: `Error: ${errorMessage}`,
            is_emergency: tel.isEmergency,
            is_medical_query: tel.isMedicalQuery,
            follow_up_count: tel.followUpCount,
            latency_ms: tel.latencyMs,
          });

          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Triage API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
