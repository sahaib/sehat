import { NextRequest } from 'next/server';
import { TranscribeResponse } from '@/types';
import { telemetry } from '@/lib/telemetry';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Rate limit: 30 transcribe requests per IP per minute
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`transcribe:${ip}`, 30);
  if (!allowed) {
    return Response.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
  }

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Audio file is required (multipart/form-data)' }, { status: 400 });
    }
    const audioFile = formData.get('audio') as File | null;
    const languageHint = formData.get('language') as string | null;

    if (!audioFile) {
      return Response.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Cap audio file size at 5MB (~30s recording)
    if (audioFile.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'Audio file too large. Please record a shorter message.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    // Build multipart form data for Sarvam API
    // Sarvam rejects MIME types with codec params (e.g. "audio/webm;codecs=opus")
    // so strip everything after the semicolon to get the base type
    const cleanType = audioFile.type.split(';')[0] || 'audio/webm';
    const cleanFile = new File([audioFile], audioFile.name || 'recording.webm', {
      type: cleanType,
    });
    const sarvamForm = new FormData();
    sarvamForm.append('file', cleanFile, cleanFile.name);
    sarvamForm.append('model', 'saarika:v2.5');
    // Use language hint or auto-detect
    sarvamForm.append('language_code', languageHint || 'unknown');

    const sarvamResponse = await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: {
        'API-Subscription-Key': apiKey,
      },
      body: sarvamForm,
    });

    if (!sarvamResponse.ok) {
      const errorBody = await sarvamResponse.text();
      console.error('Sarvam STT error:', sarvamResponse.status, errorBody);
      telemetry.recordTranscribe({
        timestamp: startTime,
        language: languageHint || 'unknown',
        latencyMs: Date.now() - startTime,
        success: false,
      });
      return Response.json(
        { error: `Transcription failed: ${sarvamResponse.status}` },
        { status: 502 }
      );
    }

    const data = await sarvamResponse.json();

    let transcript: string = data.transcript || '';

    // ── STT hallucination detection ──
    // Sarvam (and Whisper) hallucinate long text from very short/quiet audio.
    // Classic signature: tiny audio (<100KB, <2s) produces 200+ char transcripts,
    // often repetitive nonsense (e.g. Samsung Galaxy reviews, YouTube outros).
    const audioBytesPerCharRatio = audioFile.size / Math.max(transcript.length, 1);
    const isLikelyHallucination =
      // Tiny audio producing a novel
      (audioFile.size < 100_000 && transcript.length > 150) ||
      // Extremely low bytes-per-char ratio (normal speech: ~200-500 bytes/char)
      (audioBytesPerCharRatio < 50 && transcript.length > 100) ||
      // Repetitive phrases (hallucination signature: same phrase 3+ times)
      /(.{15,})\1{2,}/i.test(transcript);

    if (isLikelyHallucination) {
      console.warn('[Transcribe] Hallucination detected, rejecting:', {
        audioSize: audioFile.size,
        transcriptLen: transcript.length,
        ratio: audioBytesPerCharRatio,
        preview: transcript.slice(0, 80),
      });
      transcript = '';
    }

    const response: TranscribeResponse = {
      text: transcript,
      language: data.language_code || languageHint || 'unknown',
      confidence: isLikelyHallucination ? 0 : 1.0,
    };

    telemetry.recordTranscribe({
      timestamp: startTime,
      language: languageHint || 'unknown',
      latencyMs: Date.now() - startTime,
      success: !!response.text,
    });

    return Response.json(response);
  } catch (error) {
    console.error('Transcription error:', error);
    telemetry.recordTranscribe({
      timestamp: startTime,
      language: 'unknown',
      latencyMs: Date.now() - startTime,
      success: false,
    });
    const message =
      error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
