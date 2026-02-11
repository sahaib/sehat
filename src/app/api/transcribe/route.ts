import { NextRequest } from 'next/server';
import { TranscribeResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const languageHint = formData.get('language') as string | null;

    if (!audioFile) {
      return Response.json(
        { error: 'Audio file is required' },
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
    const sarvamForm = new FormData();
    sarvamForm.append('file', audioFile, audioFile.name || 'recording.webm');
    sarvamForm.append('model', 'saarika:v2');
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
      return Response.json(
        { error: `Transcription failed: ${sarvamResponse.status}` },
        { status: 502 }
      );
    }

    const data = await sarvamResponse.json();

    const response: TranscribeResponse = {
      text: data.transcript || '',
      language: data.language_code || languageHint || 'unknown',
      confidence: 1.0,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Transcription error:', error);
    const message =
      error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
