import { NextRequest } from 'next/server';
import { telemetry } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const MAX_CHUNK_CHARS = 480;

/**
 * Streaming TTS endpoint — sends audio sentence by sentence via SSE.
 * Client can play the first sentence immediately while the rest synthesize.
 *
 * Events:
 *   data: {"type":"audio","index":0,"total":3,"audio":"base64..."}
 *   data: {"type":"audio","index":1,"total":3,"audio":"base64..."}
 *   data: {"type":"done","totalChunks":3}
 */

/** Split text into sentences for streaming playback */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation (including Hindi danda)
  const raw = text.split(/(?<=[.!?।\n])\s+/).filter((s) => s.trim().length > 0);

  // Re-merge any fragments that are too short (< 20 chars) with the previous
  const merged: string[] = [];
  for (const s of raw) {
    if (merged.length > 0 && merged[merged.length - 1].length < 20) {
      merged[merged.length - 1] += ' ' + s;
    } else {
      merged.push(s);
    }
  }

  // Further split any sentence that exceeds Sarvam's 500 char limit
  const result: string[] = [];
  for (const s of merged) {
    if (s.length <= MAX_CHUNK_CHARS) {
      result.push(s);
    } else {
      result.push(...chunkLong(s, MAX_CHUNK_CHARS));
    }
  }

  return result;
}

function chunkLong(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf(' ', maxLen);
    if (splitAt <= 0) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks.filter((c) => c.length > 0);
}

async function synthesizeChunk(
  text: string,
  languageCode: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(SARVAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      text,
      target_language_code: languageCode,
      speaker: 'simran',
      model: 'bulbul:v3',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Sarvam TTS stream chunk error:', response.status, errorBody);
    throw new Error(`Sarvam TTS failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.audios || !data.audios[0]) {
    throw new Error('No audio returned from Sarvam');
  }

  return data.audios[0]; // base64 string
}

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

    // Strip markdown
    const plainText = text
      .replace(/#{1,3}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim();

    const langCode = language_code || 'en-IN';
    const sentences = splitSentences(plainText);
    const total = sentences.length;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Strategy: start synthesizing first sentence immediately,
        // and kick off the rest in parallel. Stream each as it arrives.
        // Use a "pipeline" approach: fire all requests, resolve in order.
        const promises = sentences.map((sentence, i) =>
          synthesizeChunk(sentence, langCode, apiKey)
            .then((audio) => ({ index: i, audio, error: null }))
            .catch((err) => ({ index: i, audio: null, error: err }))
        );

        // Await in order so client gets sequential audio
        for (let i = 0; i < promises.length; i++) {
          const result = await promises[i];
          if (result.audio) {
            send({ type: 'audio', index: i, total, audio: result.audio });
          }
          // Skip failed chunks silently — client plays what it gets
        }

        send({ type: 'done', totalChunks: total });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));

        telemetry.recordTTS({
          timestamp: startTime,
          language: langCode,
          textLength: plainText.length,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        controller.close();
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
    console.error('TTS stream error:', error);
    telemetry.recordTTS({
      timestamp: startTime,
      language: 'unknown',
      textLength: 0,
      latencyMs: Date.now() - startTime,
      success: false,
    });
    return Response.json(
      { error: error instanceof Error ? error.message : 'TTS streaming failed' },
      { status: 500 }
    );
  }
}
