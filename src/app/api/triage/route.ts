import { NextRequest } from 'next/server';
import { detectEmergency } from '@/lib/emergency-detector';
import { streamTriage } from '@/lib/triage-agent';
import { TriageRequest, StreamEvent } from '@/types';
import { telemetry, InputMode, TriageEvent } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: TriageRequest = await request.json();
    const { message, language, conversationHistory, inputMode } = body;

    if (!message?.trim() || !language) {
      return Response.json(
        { error: 'Message and language are required' },
        { status: 400 }
      );
    }

    // Server-side emergency detection (Layer 2)
    const emergencyCheck = detectEmergency(message, language);

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
      followUpCount: (conversationHistory || []).filter(m => m.isFollowUp).length,
      latencyMs: 0,
      hadError: false,
    };

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

          // Stream triage response from Claude
          for await (const event of streamTriage(
            message,
            language,
            conversationHistory || []
          )) {
            send(event);

            // Capture result metrics for telemetry
            if (event.type === 'result') {
              tel.severity = event.data.severity;
              tel.confidence = event.data.confidence;
              tel.isMedicalQuery = event.data.is_medical_query !== false;
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          tel.latencyMs = Date.now() - startTime;
          telemetry.recordTriage(tel);
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unexpected error occurred';
          send({ type: 'error', message: errorMessage });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          tel.hadError = true;
          tel.latencyMs = Date.now() - startTime;
          telemetry.recordTriage(tel);
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
