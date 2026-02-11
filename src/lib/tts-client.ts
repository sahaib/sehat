/**
 * Client-side TTS module with:
 * - WebSocket-backed TTS via /api/tts-ws (server-side proxy to Sarvam WS)
 * - Collects all progressive chunks, concatenates into ONE smooth audio blob
 * - Client-side cache (repeated plays are instant)
 * - Pre-warm support (synthesize in background before user clicks play)
 * - Fallback to REST-based /api/tts-stream
 */

// ─── Cache ──────────────────────────────────────
// Key = text+lang, Value = complete audio Blob ready to play
const audioCache = new Map<string, Blob>();

function cacheKey(text: string, lang: string): string {
  return `${lang}:${text.slice(0, 200)}`;
}

// ─── Helpers ────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    merged.set(arr, offset);
    offset += arr.length;
  }
  return merged;
}

// ─── Types ──────────────────────────────────────

export interface TTSPlaybackController {
  stop: () => void;
  done: Promise<void>;
  isPlaying: () => boolean;
}

export interface StreamTTSOptions {
  text: string;
  languageCode: string;
  useBrowserFallback?: boolean; // ignored, kept for API compat
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

// ─── Core: Fetch complete audio blob from SSE stream ──

async function fetchAudioBlob(
  text: string,
  languageCode: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const key = cacheKey(text, languageCode);

  // Return from cache if available
  const cached = audioCache.get(key);
  if (cached) return cached;

  let response: Response;
  let isMp3 = true;

  try {
    response = await fetch('/api/tts-ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: languageCode }),
      signal,
    });
    if (!response.ok) throw new Error('ws-fail');
  } catch {
    // Fallback to REST
    isMp3 = false;
    response = await fetch('/api/tts-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: languageCode }),
      signal,
    });
    if (!response.ok) return null;
  }

  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const allChunks: Uint8Array[] = [];

  while (true) {
    if (signal?.aborted) return null;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;

      try {
        const event = JSON.parse(data);
        if (event.type === 'audio' && event.audio) {
          allChunks.push(base64ToBytes(event.audio));
          if (event.format === 'mp3') isMp3 = true;
        }
      } catch { /* skip */ }
    }
  }

  if (allChunks.length === 0) return null;

  const merged = concatBytes(allChunks);
  const mimeType = isMp3 ? 'audio/mpeg' : 'audio/wav';
  const blob = new Blob([merged.buffer as ArrayBuffer], { type: mimeType });

  // Cache for instant replay
  audioCache.set(key, blob);
  return blob;
}

// ─── Play a Blob ────────────────────────────────

function playBlob(
  blob: Blob,
  onStart?: () => void,
  onEnd?: () => void,
): { audio: HTMLAudioElement; done: Promise<void> } {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  let resolveAll: () => void;
  const done = new Promise<void>((r) => { resolveAll = r; });

  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
    resolveAll();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
    resolveAll();
  };

  onStart?.();
  audio.play().catch(() => {
    onEnd?.();
    resolveAll();
  });

  return { audio, done };
}

// ─── Main API: Stream TTS ───────────────────────

export function streamTTS(options: StreamTTSOptions): TTSPlaybackController {
  const { text, languageCode, onStart, onEnd, onError } = options;

  const key = cacheKey(text, languageCode);
  let stopped = false;
  let currentAudio: HTMLAudioElement | null = null;
  let resolveController: (() => void) | null = null;
  const controllerDone = new Promise<void>((r) => { resolveController = r; });
  let playing = false;

  // Instant path: cached blob
  const cached = audioCache.get(key);
  if (cached) {
    const { audio, done } = playBlob(cached, onStart, () => {
      playing = false;
      currentAudio = null;
      onEnd?.();
      resolveController?.();
    });
    currentAudio = audio;
    playing = true;

    return {
      stop: () => {
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        playing = false;
        resolveController?.();
      },
      done: controllerDone,
      isPlaying: () => playing,
    };
  }

  // Fetch, collect all chunks, then play as one smooth blob
  const abortController = new AbortController();

  const run = async () => {
    try {
      const blob = await fetchAudioBlob(text, languageCode, abortController.signal);

      if (stopped || !blob) {
        if (!stopped && !blob) onError?.('No audio received');
        onEnd?.();
        resolveController?.();
        return;
      }

      const { audio, done } = playBlob(blob, onStart, () => {
        playing = false;
        currentAudio = null;
        onEnd?.();
        resolveController?.();
      });
      currentAudio = audio;
      playing = true;

      await done;
    } catch (err) {
      if (!stopped) {
        onError?.(err instanceof Error ? err.message : 'TTS failed');
        onEnd?.();
      }
      resolveController?.();
    }
  };

  run();

  return {
    stop: () => {
      stopped = true;
      abortController.abort();
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      playing = false;
      resolveController?.();
    },
    done: controllerDone,
    isPlaying: () => playing,
  };
}

// ─── Pre-warm: synthesize in background ─────────

const prewarmCache = new Map<string, Promise<void>>();

export function prewarmTTS(text: string, languageCode: string): void {
  if (!text?.trim()) return;
  const key = cacheKey(text, languageCode);

  if (audioCache.has(key) || prewarmCache.has(key)) return;

  const promise = (async () => {
    try {
      await fetchAudioBlob(text, languageCode);
    } catch { /* silent */ }
    finally {
      prewarmCache.delete(key);
    }
  })();

  prewarmCache.set(key, promise);
}

// ─── Legacy one-shot TTS ────────────────────────

export async function fetchTTSBlob(
  text: string,
  languageCode: string,
): Promise<Blob | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: languageCode }),
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}
