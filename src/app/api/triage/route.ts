import { NextRequest } from 'next/server';
import { detectEmergency } from '@/lib/emergency-detector';
import { streamTriage } from '@/lib/triage-agent';
import { TriageRequest, StreamEvent } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: TriageRequest = await request.json();
    const { message, language, conversationHistory } = body;

    if (!message?.trim() || !language) {
      return Response.json(
        { error: 'Message and language are required' },
        { status: 400 }
      );
    }

    // Server-side emergency detection (Layer 2)
    const emergencyCheck = detectEmergency(message, language);

    const encoder = new TextEncoder();

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
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unexpected error occurred';
          send({ type: 'error', message: errorMessage });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
