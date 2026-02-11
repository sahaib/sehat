import { Language, Message } from '@/types';
import { SUPPORTED_LANGUAGES } from './constants';

const VALID_LANGUAGE_CODES = new Set<string>(
  SUPPORTED_LANGUAGES.map((l) => l.code)
);

const MAX_MESSAGE_LENGTH = 5000;
const MAX_CONVERSATION_MESSAGES = 20;

// Patterns that indicate prompt injection attempts (case-insensitive)
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|guidelines|prompts)/i,
  /ignore\s+all\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules)/i,
  /you\s+are\s+now\s+(a|an|my)\s+/i,
  /new\s+(role|persona|identity|instructions?):/i,
  /^system:/im,
  /###\s*INSTRUCTION/i,
  /forget\s+(your|all|previous)\s+(rules|instructions|guidelines|role)/i,
  /override\s+(your|all|previous)\s+(rules|instructions|guidelines)/i,
  /do\s+not\s+follow\s+(your|the)\s+(rules|instructions|guidelines)/i,
  /act\s+as\s+(a|an|if\s+you\s+are)\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+me\s+(your|the)\s+(system\s+)?prompt/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions)/i,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  // Hindi injection patterns
  /अपने\s+(नियम|निर्देश)\s+(भूल|छोड़|बदल)/i,
  /सब\s+निर्देश\s+(भूल|छोड़)/i,
];

/**
 * Validates that a language code is one of our supported languages.
 * Returns the validated Language or defaults to 'en'.
 */
export function validateLanguage(lang: unknown): Language {
  if (typeof lang === 'string' && VALID_LANGUAGE_CODES.has(lang)) {
    return lang as Language;
  }
  return 'en';
}

/**
 * Sanitizes user message text.
 * - Trims and enforces max length
 * - Strips null bytes and control characters
 * - Detects prompt injection patterns (flags but does NOT block)
 */
export function sanitizeMessage(text: string): {
  text: string;
  flagged: boolean;
  reason?: string;
} {
  // Strip null bytes and control characters (keep newlines and tabs)
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  // Enforce max length
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    cleaned = cleaned.slice(0, MAX_MESSAGE_LENGTH);
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        text: cleaned,
        flagged: true,
        reason: 'Potential prompt injection detected',
      };
    }
  }

  return { text: cleaned, flagged: false };
}

/**
 * Sanitizes conversation history array.
 * - Caps at MAX_CONVERSATION_MESSAGES (most recent)
 * - Validates each message has valid role
 * - Enforces max content length per message
 * - Removes messages with invalid structure
 */
export function sanitizeConversationHistory(messages: unknown): Message[] {
  if (!Array.isArray(messages)) return [];

  const valid: Message[] = [];

  for (const msg of messages) {
    if (
      typeof msg !== 'object' ||
      msg === null ||
      typeof (msg as Message).content !== 'string' ||
      typeof (msg as Message).role !== 'string'
    ) {
      continue;
    }

    const role = (msg as Message).role;
    if (role !== 'user' && role !== 'assistant') {
      continue;
    }

    let content = (msg as Message).content;
    // Strip control characters
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Enforce max length
    if (content.length > MAX_MESSAGE_LENGTH) {
      content = content.slice(0, MAX_MESSAGE_LENGTH);
    }

    valid.push({
      ...(msg as Message),
      role,
      content,
    });
  }

  // Keep only the most recent messages
  if (valid.length > MAX_CONVERSATION_MESSAGES) {
    return valid.slice(-MAX_CONVERSATION_MESSAGES);
  }

  return valid;
}
