'use client';

/**
 * Generates a gentle ambient drone using Web Audio API.
 * Plays during the thinking phase to make the wait feel intentional.
 * Uses two detuned sine waves with slow volume breathing for a warm, calming effect.
 */

let audioCtx: AudioContext | null = null;
let activeNodes: { gainNode: GainNode; oscillators: OscillatorNode[] } | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function startCalmAudio() {
  try {
    // Don't stack multiple instances
    if (activeNodes) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Master gain — start silent, fade in
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);

    // Two soft sine waves, slightly detuned for warmth
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(174, ctx.currentTime); // F3 — grounding frequency
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.6, ctx.currentTime);
    osc1.connect(gain1).connect(masterGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(261, ctx.currentTime); // C4 — gentle fifth above
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    osc2.connect(gain2).connect(masterGain);

    // Slow LFO for breathing effect on master volume
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // ~7s breathing cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.03, ctx.currentTime); // subtle volume oscillation
    lfo.connect(lfoGain).connect(masterGain.gain);

    osc1.start();
    osc2.start();
    lfo.start();

    activeNodes = {
      gainNode: masterGain,
      oscillators: [osc1, osc2, lfo],
    };
  } catch {
    // Web Audio API not available — silently skip
  }
}

export function stopCalmAudio() {
  if (!activeNodes || !audioCtx) return;

  try {
    const ctx = audioCtx;
    const { gainNode, oscillators } = activeNodes;

    // Fade out over 0.8s
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    // Stop oscillators after fade
    setTimeout(() => {
      oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* already stopped */ }
      });
    }, 900);

    activeNodes = null;
  } catch {
    activeNodes = null;
  }
}

export function isPlayingCalm(): boolean {
  return activeNodes !== null;
}
