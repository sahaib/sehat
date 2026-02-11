import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const MAX_CHARS = 1500;

export async function POST(request: NextRequest) {
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

    // Truncate to Sarvam's 1500 char limit
    const trimmedText = text.slice(0, MAX_CHARS);

    const sarvamResponse = await fetch(SARVAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': apiKey,
      },
      body: JSON.stringify({
        inputs: trimmedText,
        target_language_code: language_code || 'en-IN',
        speaker: 'meera',
        model: 'bulbul:v2',
        pace: 1.0,
        pitch: 0.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    });

    if (!sarvamResponse.ok) {
      const errorBody = await sarvamResponse.text();
      console.error('Sarvam TTS error:', sarvamResponse.status, errorBody);
      return Response.json(
        { error: `Sarvam TTS failed: ${sarvamResponse.status}` },
        { status: 502 }
      );
    }

    const data = await sarvamResponse.json();

    if (!data.audios || !data.audios[0]) {
      return Response.json(
        { error: 'No audio returned from Sarvam' },
        { status: 502 }
      );
    }

    // Decode base64 WAV and return as binary audio
    const audioBuffer = Buffer.from(data.audios[0], 'base64');

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    const message =
      error instanceof Error ? error.message : 'Text-to-speech failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
