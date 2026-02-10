import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { TranscribeResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI();

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

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      ...(languageHint ? { language: languageHint } : {}),
    });

    const response: TranscribeResponse = {
      text: transcription.text,
      language: transcription.language || languageHint || 'unknown',
      confidence: 1.0, // Whisper doesn't provide confidence per-transcription
    };

    return Response.json(response);
  } catch (error) {
    console.error('Transcription error:', error);
    const message =
      error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
