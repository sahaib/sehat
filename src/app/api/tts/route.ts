import { NextRequest } from 'next/server';
import { telemetry } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const MAX_CHUNK_CHARS = 480; // Sarvam limit is 500; leave buffer

/** Split text into chunks at sentence boundaries, each <= maxLen chars */
function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at sentence boundary (. ! ?)
    let splitAt = -1;
    for (let i = maxLen; i >= maxLen / 2; i--) {
      if ('.!?।'.includes(remaining[i])) {
        splitAt = i + 1;
        break;
      }
    }
    // Fallback: split at last space
    if (splitAt === -1) {
      splitAt = remaining.lastIndexOf(' ', maxLen);
    }
    // Last resort: hard cut
    if (splitAt <= 0) {
      splitAt = maxLen;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

async function synthesizeChunk(
  text: string,
  languageCode: string,
  apiKey: string
): Promise<Buffer> {
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
    console.error('Sarvam TTS chunk error:', response.status, errorBody);
    throw new Error(`Sarvam TTS failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.audios || !data.audios[0]) {
    throw new Error('No audio returned from Sarvam');
  }

  return Buffer.from(data.audios[0], 'base64');
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
      return Response.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    // Strip markdown formatting for cleaner speech
    const plainText = text
      .replace(/#{1,3}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim();

    const langCode = language_code || 'en-IN';
    const chunks = chunkText(plainText, MAX_CHUNK_CHARS);

    // Synthesize all chunks in parallel for multi-chunk responses (3-5x faster)
    const audioBuffers: Buffer[] = await Promise.all(
      chunks.map((chunk) => synthesizeChunk(chunk, langCode, apiKey))
    );

    // Concatenate WAV files: use header from first, append raw data from rest
    let finalAudio: Buffer;
    if (audioBuffers.length === 1) {
      finalAudio = audioBuffers[0];
    } else {
      // WAV header is 44 bytes; concatenate data portions
      const headerSize = 44;
      const header = audioBuffers[0].subarray(0, headerSize);
      const dataParts = audioBuffers.map((buf, i) =>
        i === 0 ? buf.subarray(headerSize) : buf.subarray(headerSize)
      );
      const totalDataSize = dataParts.reduce((sum, d) => sum + d.length, 0);

      // Update header with correct total size
      const newHeader = Buffer.from(header);
      // Bytes 4-7: file size - 8
      newHeader.writeUInt32LE(totalDataSize + headerSize - 8, 4);
      // Bytes 40-43: data chunk size
      newHeader.writeUInt32LE(totalDataSize, 40);

      finalAudio = Buffer.concat([newHeader, ...dataParts]);
    }

    telemetry.recordTTS({
      timestamp: startTime,
      language: langCode,
      textLength: plainText.length,
      latencyMs: Date.now() - startTime,
      success: true,
    });

    const uint8 = new Uint8Array(finalAudio);
    return new Response(uint8, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': uint8.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    telemetry.recordTTS({
      timestamp: startTime,
      language: 'unknown',
      textLength: 0,
      latencyMs: Date.now() - startTime,
      success: false,
    });
    const message =
      error instanceof Error ? error.message : 'Text-to-speech failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
