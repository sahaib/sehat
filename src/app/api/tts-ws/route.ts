import { NextRequest } from 'next/server';
import WebSocket from 'ws';
import { telemetry } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_WS_URL = 'wss://api.sarvam.ai/text-to-speech/ws';

/**
 * WebSocket-proxied streaming TTS endpoint.
 *
 * Opens a real WebSocket to Sarvam's TTS streaming API, sends text,
 * and relays progressive MP3 audio chunks back to the client via SSE.
 *
 * Advantages over REST-based /api/tts-stream:
 * - Single connection handles up to 2500 chars (no manual chunking)
 * - Progressive audio delivery — first chunk in ~200-300ms
 * - MP3 format = smaller payloads, faster transfer
 * - Sarvam handles sentence splitting internally
 *
 * Events sent to client:
 *   data: {"type":"audio","index":0,"audio":"base64...","format":"mp3"}
 *   data: {"type":"done","totalChunks":5}
 *   data: [DONE]
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { text, language_code } = await request.json();

    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Sarvam API key not configured' }, { status: 500 });
    }

    // Strip markdown for cleaner speech
    const plainText = text
      .replace(/#{1,3}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim();

    if (!plainText) {
      return Response.json({ error: 'No text after stripping markdown' }, { status: 400 });
    }

    const langCode = language_code || 'en-IN';
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        const send = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Controller may be closed
          }
        };

        let chunkIndex = 0;
        let wsOpen = false;
        let completed = false;

        const ws = new WebSocket(
          `${SARVAM_WS_URL}?model=bulbul:v3&send_completion_event=true`,
          {
            headers: {
              'api-subscription-key': apiKey,
            },
          }
        );

        const cleanup = () => {
          if (!completed) {
            completed = true;
            send({ type: 'done', totalChunks: chunkIndex });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));

            telemetry.recordTTS({
              timestamp: startTime,
              language: langCode,
              textLength: plainText.length,
              latencyMs: Date.now() - startTime,
              success: chunkIndex > 0,
            });

            try {
              controller.close();
            } catch {
              // Already closed
            }
          }
        };

        ws.on('open', () => {
          wsOpen = true;

          // Step 1: Send config
          ws.send(JSON.stringify({
            type: 'config',
            data: {
              target_language_code: langCode,
              speaker: 'simran',
              pace: 1.0,
              temperature: 0.6,
              speech_sample_rate: 24000,
              output_audio_codec: 'mp3',
              output_audio_bitrate: '128k',
              min_buffer_size: 30,   // Minimum for fastest first audio
              max_chunk_length: 150, // Natural sentence boundaries
              enable_preprocessing: true,
            },
          }));

          // Step 2: Send text (up to 2500 chars, no manual chunking needed)
          ws.send(JSON.stringify({
            type: 'text',
            data: { text: plainText.slice(0, 2500) },
          }));

          // Step 3: Flush to process any remaining buffer
          ws.send(JSON.stringify({ type: 'flush' }));
        });

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === 'audio' && msg.data?.audio) {
              // Stream audio chunk to client immediately
              send({
                type: 'audio',
                index: chunkIndex,
                audio: msg.data.audio,
                format: 'mp3',
              });
              chunkIndex++;
            } else if (msg.type === 'event' && msg.data?.event_type === 'final') {
              // Audio generation complete
              cleanup();
              ws.close();
            } else if (msg.type === 'error') {
              console.error('Sarvam WS TTS error:', msg.data?.message);
              if (chunkIndex === 0) {
                send({ type: 'error', message: msg.data?.message || 'TTS failed' });
              }
              cleanup();
              ws.close();
            }
          } catch {
            // Skip malformed messages
          }
        });

        ws.on('error', (err) => {
          console.error('Sarvam WS connection error:', err.message);
          if (chunkIndex === 0) {
            send({ type: 'error', message: 'WebSocket connection failed' });
          }
          cleanup();
        });

        ws.on('close', () => {
          wsOpen = false;
          cleanup();
        });

        // Safety timeout — close after 30s max
        setTimeout(() => {
          if (wsOpen && !completed) {
            console.warn('TTS WebSocket timeout after 30s');
            cleanup();
            ws.close();
          }
        }, 30000);
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
    console.error('TTS WS route error:', error);
    telemetry.recordTTS({
      timestamp: startTime,
      language: 'unknown',
      textLength: 0,
      latencyMs: Date.now() - startTime,
      success: false,
    });
    return Response.json(
      { error: error instanceof Error ? error.message : 'TTS WebSocket streaming failed' },
      { status: 500 }
    );
  }
}
