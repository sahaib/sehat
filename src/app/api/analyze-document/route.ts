import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ANALYSIS_PROMPT = `You are Sehat, a medical triage assistant for India. The user has uploaded a medical document.

Analyze this document and provide a clear, simple breakdown:

1. **Document Type**: What kind of document is this? (lab report, prescription, discharge summary, etc.)
2. **Key Findings**: List the important findings in simple, non-technical language
3. **Medications** (if any): For each medicine mentioned:
   - Name and dosage
   - What it's commonly used for (in simple terms)
   - Important precautions
4. **Values Outside Normal Range** (if lab report): Highlight anything abnormal and explain what it means
5. **Action Items**: What should the patient do based on this document?

IMPORTANT:
- Use simple language that a non-medical person can understand
- If the document is in a regional Indian language, respond in that language
- Include a disclaimer that this is AI analysis and they should consult their doctor
- Never make a diagnosis — only explain what the document contains`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string || 'en';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Read file as base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Determine media type
    const fileType = file.type;
    const isPDF = fileType === 'application/pdf';
    const isImage = fileType.startsWith('image/');

    if (!isPDF && !isImage) {
      return Response.json(
        { error: 'Please upload an image (JPEG, PNG) or PDF file' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const mediaType = isPDF ? 'application/pdf' as const : fileType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const sourceType = isPDF ? 'base64' as const : 'base64' as const;

    const content: Anthropic.Messages.ContentBlockParam[] = [
      {
        type: isPDF ? 'document' : 'image',
        source: {
          type: sourceType,
          media_type: mediaType,
          data: base64,
        },
      } as Anthropic.Messages.ContentBlockParam,
      {
        type: 'text',
        text: `${ANALYSIS_PROMPT}\n\nRespond in the user's preferred language: ${language}. If the document is in a different language, still explain in ${language}.`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });

    const analysisText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return Response.json({ analysis: analysisText });
  } catch (error) {
    console.error('Document analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
