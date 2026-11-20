/*
 * High-quality narration streamed from the Cinebox audio engine (/api/audio/speak).
 * Plays the exact same studio neural voices on every device (iPhone, Android, Mac, PC).
 * Falls back gracefully to browser SpeechSynthesis if offline.
 */

export const HAS_TTS = typeof window !== 'undefined';

export const STORY_VOICES = [
  { id: 'en-US-ChristopherNeural', name: 'Christopher', label: 'Christopher (Deep)', gender: 'male' },
  { id: 'en-NG-AbeoNeural', name: 'Abeo', label: 'Abeo (Nigerian)', gender: 'male' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', label: 'Ryan (British)', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', label: 'Sonia (UK Female)', gender: 'female' },
  { id: 'en-NG-EzinneNeural', name: 'Ezinne', label: 'Ezinne (NG Female)', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy', label: 'Guy (Conversational)', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny', label: 'Jenny (Clear)', gender: 'female' },
];

const VOICE_KEY = 'cinebox_voice_id';

export function getSelectedVoice() {
  if (typeof localStorage === 'undefined') return STORY_VOICES[0];
  const saved = localStorage.getItem(VOICE_KEY);
  return STORY_VOICES.find((v) => v.id === saved) || STORY_VOICES[0];
}

export function cycleVoice() {
  const current = getSelectedVoice();
  const idx = STORY_VOICES.findIndex((v) => v.id === current.id);
  const next = STORY_VOICES[(idx + 1) % STORY_VOICES.length];
  try {
    localStorage.setItem(VOICE_KEY, next.id);
  } catch {
    /* ignore */
  }
  return next;
}

let currentAudio = null;

/* ---- loudness, for lip sync in the 3D player ------------------------------------------------------------------
 * The line's audio element is routed through an AnalyserNode so the player can ask "how loud is the voice right now?".
 * Only done when the AudioContext is already running: routing sound through a suspended context would silence it.
 * Without an analyser (or with browser speech) getVoiceLevel() falls back to a gentle made-up pulse while speaking. */
let audioCtx = null;
let analyser = null;
let levelBuf = null;
let tap = null;
let fallbackActive = false;

function ensureContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx || new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function attachAnalyser(audio) {
  detachAnalyser();
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;
  try {
    const source = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    levelBuf = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    tap = source;
  } catch {
    analyser = null;
  }
}

function detachAnalyser() {
  try {
    tap?.disconnect();
    analyser?.disconnect();
  } catch {
    /* ignore */
  }
  tap = null;
  analyser = null;
}

/** 0 to 1: how loud the current line is right now. 0 when nothing is being spoken. */
export function getVoiceLevel() {
  const playing = currentAudio && !currentAudio.paused && currentAudio.currentTime > 0;
  if (analyser && playing) {
    analyser.getByteTimeDomainData(levelBuf);
    let sum = 0;
    for (let i = 0; i < levelBuf.length; i++) {
      const v = (levelBuf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / levelBuf.length) * 5);
  }
  if (playing || fallbackActive) return 0.3 + 0.35 * Math.abs(Math.sin(performance.now() / 95)) * (0.6 + 0.4 * Math.sin(performance.now() / 410));
  return 0;
}

export function cancelSpeech() {
  fallbackActive = false;
  detachAnalyser();
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Speak one line using the server audio stream.
 * Callbacks: onboundary(charIndex), onend(), onerror().
 */
export function speak(text, { pitch = 1, rate = 1, onboundary, onend, onerror, voice }) {
  cancelSpeech();

  const activeVoice = voice || getSelectedVoice().id;
  const ratePct = rate === 1 ? '+0%' : `${Math.round((rate - 1) * 100)}%`;
  const pitchHz = pitch === 1 ? '+0Hz' : `${Math.round((pitch - 1) * 50)}Hz`;

  const audioUrl = `/api/audio/speak?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(activeVoice)}&rate=${encodeURIComponent(ratePct)}&pitch=${encodeURIComponent(pitchHz)}`;

  const audio = new Audio(audioUrl);
  currentAudio = audio;
  attachAnalyser(audio);

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    if (currentAudio === audio) currentAudio = null;
    fallbackActive = false;
    if (onend) onend();
  };

  audio.onended = finish;

  // Approximate word boundaries during audio playback for subtitle highlighting
  audio.ontimeupdate = () => {
    if (audio.duration && onboundary) {
      const progress = Math.min(1, audio.currentTime / audio.duration);
      const charIndex = Math.floor(progress * text.length);
      onboundary(charIndex);
    }
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
    // Fall back to browser SpeechSynthesis if audio stream fails
    fallbackSpeechSynthesis(text, { pitch, rate, onboundary, onend: finish, onerror });
  };

  const playPromise = audio.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch((err) => {
      // Browser blocked autoplay or network error
      fallbackSpeechSynthesis(text, { pitch, rate, onboundary, onend: finish, onerror });
    });
  }
}

function fallbackSpeechSynthesis(text, { pitch = 1, rate = 1, onboundary, onend, onerror }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onend) onend();
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    fallbackActive = true;
    u.pitch = Math.max(0.1, Math.min(2, pitch));
    u.rate = Math.max(0.5, Math.min(2, rate));
    u.onend = () => {
      fallbackActive = false;
      onend?.();
    };
    u.onerror = (e) => {
      fallbackActive = false;
      onerror?.(e);
    };
    u.onboundary = (e) => onboundary && onboundary(e.charIndex || 0);
    window.speechSynthesis.speak(u);
  } catch (err) {
    if (onerror) onerror(err);
    else if (onend) onend();
  }
}

/**
 * Mobile browsers block sound until user taps.
 * Unlocks HTML5 audio & SpeechSynthesis inside user tap handler.
 */
export function unlockSpeech() {
  if (typeof window === 'undefined') return;
  try {
    ensureContext()?.resume(); // must happen inside the tap so later lines can be analysed
  } catch {
    /* ignore */
  }
  try {
    const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    a.volume = 0;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
  if ('speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}
