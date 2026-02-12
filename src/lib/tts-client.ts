/**
 * Client-side TTS module with:
 * - Progressive audio playback — plays first chunk immediately via MediaSource API
 * - WebSocket-backed TTS via /api/tts-ws (server-side proxy to Sarvam WS)
 * - Client-side cache (repeated plays are instant)
 * - Pre-warm support (synthesize in background before user clicks play)
 * - Fallback to blob-collect for browsers without MediaSource audio/mpeg
 */

// ─── Cache (LRU-bounded) ────────────────────────
// Key = text+lang, Value = complete audio Blob ready to play
const MAX_CACHE_ENTRIES = 50;
const audioCache = new Map<string, Blob>();

function cacheKey(text: string, lang: string): string {
  let hash = 0;
  const str = `${lang}:${text}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return `${lang}:${hash}:${text.length}`;
}

function cacheSet(key: string, blob: Blob): void {
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = audioCache.keys().next().value;
    if (oldest !== undefined) audioCache.delete(oldest);
  }
  audioCache.set(key, blob);
}

// ─── Markdown stripping ─────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,3}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{2460}-\u{24FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

// ─── Check progressive support ──────────────────

function canUseMediaSource(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof MediaSource === 'undefined') return false;
  // Chrome supports audio/mpeg in MediaSource. Safari/Firefox do not.
  return MediaSource.isTypeSupported('audio/mpeg');
}

// ─── SSE chunk reader (shared by both paths) ────

interface ChunkReader {
  response: Response;
  signal?: AbortSignal;
  onChunk: (bytes: Uint8Array) => void;
  onDone: () => void;
}

async function readSSEChunks({ response, signal, onChunk, onDone }: ChunkReader): Promise<Uint8Array[]> {
  if (!response.body) { onDone(); return []; }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const allChunks: Uint8Array[] = [];

  try {
    while (true) {
      if (signal?.aborted) break;
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
            const bytes = base64ToBytes(event.audio);
            allChunks.push(bytes);
            onChunk(bytes);
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    onDone();
  }

  return allChunks;
}

// ─── Fetch TTS response (WS primary, REST fallback) ─

async function fetchTTSResponse(
  text: string,
  languageCode: string,
  signal?: AbortSignal,
): Promise<Response | null> {
  const cleanText = stripMarkdown(text);
  if (!cleanText) return null;

  try {
    const response = await fetch('/api/tts-ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, language_code: languageCode }),
      signal,
    });
    if (response.ok) return response;
  } catch { /* fallback */ }

  try {
    const response = await fetch('/api/tts-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, language_code: languageCode }),
      signal,
    });
    if (response.ok) return response;
  } catch { /* fail */ }

  return null;
}

// ─── Progressive playback via MediaSource ───────
// Plays audio chunks the INSTANT they arrive from the server.
// First audio heard within ~200-300ms instead of waiting 1-2s for all chunks.

async function progressivePlay(
  text: string,
  languageCode: string,
  signal: AbortSignal,
  callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (msg: string) => void;
  },
): Promise<{ audio: HTMLAudioElement; done: Promise<void> } | null> {
  const response = await fetchTTSResponse(text, languageCode, signal);
  if (!response) return null;

  const mediaSource = new MediaSource();
  const audio = new Audio();
  const objectUrl = URL.createObjectURL(mediaSource);
  audio.src = objectUrl;

  let resolveAll: () => void;
  const done = new Promise<void>((r) => { resolveAll = r; });
  let started = false;
  let ended = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    URL.revokeObjectURL(objectUrl);
    callbacks.onEnd?.();
    resolveAll();
  };

  audio.onended = finish;
  audio.onerror = finish;

  // Wait for MediaSource to be ready
  await new Promise<void>((resolve) => {
    mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
  });

  let sourceBuffer: SourceBuffer;
  try {
    sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
  } catch {
    finish();
    return null;
  }

  // Queue for appending chunks (SourceBuffer can only handle one append at a time)
  const appendQueue: Uint8Array[] = [];
  let appending = false;

  function processQueue() {
    if (appending || appendQueue.length === 0 || sourceBuffer.updating) return;
    appending = true;
    try {
      const chunk = appendQueue.shift()!;
      sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
    } catch {
      appending = false;
      // SourceBuffer error — abort progressive playback
    }
  }

  sourceBuffer.addEventListener('updateend', () => {
    appending = false;
    processQueue();
  });

  const allChunks = await readSSEChunks({
    response,
    signal,
    onChunk: (bytes) => {
      appendQueue.push(bytes);
      processQueue();

      // Start playing as soon as first chunk is appended
      if (!started && !signal.aborted) {
        started = true;
        callbacks.onStart?.();
        audio.play().catch(() => {});
      }
    },
    onDone: () => {
      // Wait for pending appends, then signal end of stream
      const closeStream = () => {
        if (mediaSource.readyState === 'open') {
          try { mediaSource.endOfStream(); } catch { /* ok */ }
        }
      };
      if (sourceBuffer.updating) {
        sourceBuffer.addEventListener('updateend', closeStream, { once: true });
      } else {
        closeStream();
      }
    },
  });

  // Cache the full audio for instant replay next time
  if (allChunks.length > 0) {
    const merged = concatBytes(allChunks);
    const blob = new Blob([merged.buffer as ArrayBuffer], { type: 'audio/mpeg' });
    const key = cacheKey(text, languageCode);
    cacheSet(key, blob);
  }

  if (!started) {
    // No audio chunks received
    finish();
    return null;
  }

  return { audio, done };
}

// ─── Blob-collect playback (fallback) ───────────
// Collects ALL chunks then plays. Used when MediaSource isn't available.

async function fetchAudioBlob(
  text: string,
  languageCode: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const key = cacheKey(text, languageCode);

  const cached = audioCache.get(key);
  if (cached) return cached;

  const response = await fetchTTSResponse(text, languageCode, signal);
  if (!response) return null;

  const allChunks = await readSSEChunks({
    response,
    signal,
    onChunk: () => {},
    onDone: () => {},
  });

  if (allChunks.length === 0) return null;

  const merged = concatBytes(allChunks);
  const blob = new Blob([merged.buffer as ArrayBuffer], { type: 'audio/mpeg' });
  cacheSet(key, blob);
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

  const endCallbacks = () => {
    playing = false;
    currentAudio = null;
    onEnd?.();
    resolveController?.();
  };

  // Instant path: cached blob → play immediately, no network
  const cached = audioCache.get(key);
  if (cached) {
    const { audio } = playBlob(cached, onStart, endCallbacks);
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

  const abortController = new AbortController();

  const run = async () => {
    try {
      // If a pre-warm is in-flight, wait for it (avoids duplicate fetch)
      const pendingPrewarm = prewarmCache.get(key);
      if (pendingPrewarm) {
        await pendingPrewarm;
        const prewarmed = audioCache.get(key);
        if (prewarmed && !stopped) {
          const { audio, done } = playBlob(prewarmed, onStart, endCallbacks);
          currentAudio = audio;
          playing = true;
          await done;
          return;
        }
      }

      if (stopped) { endCallbacks(); return; }

      // Try progressive playback — starts audio within ~200ms
      if (canUseMediaSource()) {
        const result = await progressivePlay(
          text, languageCode, abortController.signal,
          { onStart, onEnd: endCallbacks, onError },
        );
        if (result) {
          currentAudio = result.audio;
          playing = true;
          await result.done;
          return;
        }
      }

      // Fallback: collect all chunks then play
      const blob = await fetchAudioBlob(text, languageCode, abortController.signal);

      if (stopped || !blob) {
        if (!stopped && !blob) onError?.('No audio received');
        endCallbacks();
        return;
      }

      const { audio, done } = playBlob(blob, onStart, endCallbacks);
      currentAudio = audio;
      playing = true;
      await done;
    } catch (err) {
      if (!stopped) {
        onError?.(err instanceof Error ? err.message : 'TTS failed');
      }
      endCallbacks();
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
