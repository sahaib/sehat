import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, getLanguageLabel } from './prompts';
import { Language, Message, StreamEvent, TriageResult } from '@/types';
import { MODEL_ID, THINKING_BUDGET } from './constants';

const client = new Anthropic();

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // 529 = overloaded, 500 = internal, 502/503 = gateway/unavailable
    return [529, 500, 502, 503].includes(error.status);
  }
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  return false;
}

export async function* streamTriage(
  userMessage: string,
  language: Language,
  conversationHistory: Message[]
): AsyncGenerator<StreamEvent> {
  const languageLabel = getLanguageLabel(language);

  // Build messages array from conversation history
  const messages: Anthropic.MessageParam[] = conversationHistory.map(
    (msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })
  );

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Retry loop for transient API errors
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model: MODEL_ID,
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: THINKING_BUDGET,
        },
        system: buildSystemPrompt(language, languageLabel),
        messages,
      });

      let currentBlockType: 'thinking' | 'text' | null = null;
      let textAccumulator = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'thinking') {
            currentBlockType = 'thinking';
          } else if (event.content_block.type === 'text') {
            currentBlockType = 'text';
            textAccumulator = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (
            event.delta.type === 'thinking_delta' &&
            currentBlockType === 'thinking'
          ) {
            yield { type: 'thinking', content: event.delta.thinking };
          } else if (
            event.delta.type === 'text_delta' &&
            currentBlockType === 'text'
          ) {
            textAccumulator += event.delta.text;
            yield { type: 'text', content: event.delta.text };
          }
        } else if (event.type === 'content_block_stop') {
          if (currentBlockType === 'thinking') {
            yield { type: 'thinking_done' };
          } else if (currentBlockType === 'text') {
            // Parse the accumulated JSON response
            const result = parseTriageResult(textAccumulator);
            if (result) {
              // For non-medical queries, skip follow-up logic and yield result directly
              if (result.is_medical_query === false) {
                yield { type: 'result', data: result };
              } else {
                if (result.needs_follow_up && result.follow_up_question) {
                  yield {
                    type: 'follow_up',
                    question: result.follow_up_question,
                  };
                }
                yield { type: 'result', data: result };
              }
            } else {
              yield {
                type: 'error',
                message:
                  'Failed to parse triage result. Please try describing your symptoms again.',
              };
            }
          }
          currentBlockType = null;
        }
      }

      // Success — exit retry loop
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1 && isRetryableError(error)) {
        const delay = RETRY_DELAYS[attempt] || 4000;
        console.warn(`[triage-agent] Attempt ${attempt + 1} failed (${error instanceof Error ? error.message : 'unknown'}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // Non-retryable or final attempt — throw
      throw error;
    }
  }

  // Should never reach here, but safety net
  throw lastError || new Error('Triage failed after retries');
}

function parseTriageResult(text: string): TriageResult | null {
  // Try direct parse first
  try {
    return JSON.parse(text) as TriageResult;
  } catch {
    // Fallback: extract JSON from text using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as TriageResult;
      } catch {
        return null;
      }
    }
    return null;
  }
}
