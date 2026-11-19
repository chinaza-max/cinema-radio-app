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

export function cancelSpeech() {
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

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    if (currentAudio === audio) currentAudio = null;
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
    u.pitch = Math.max(0.1, Math.min(2, pitch));
    u.rate = Math.max(0.5, Math.min(2, rate));
    u.onend = onend;
    u.onerror = onerror;
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
