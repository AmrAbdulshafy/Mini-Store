// Exact notification sound playback matching ZagServe's playChatRingSound implementation

let sharedAudioCtx: AudioContext | null = null;
let sharedChatAudio: HTMLAudioElement | null = null;
let audioElementPrimed = false;

function getUnlockedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function getSharedChatAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedChatAudio) {
    sharedChatAudio = new Audio('/sounds/chat-notification.mp3');
    sharedChatAudio.preload = 'auto';
    sharedChatAudio.volume = 0.85;
  }
  return sharedChatAudio;
}

export function unlockChatNotificationAudio(): void {
  getUnlockedAudioContext();
  const audio = getSharedChatAudio();
  if (audio && !audioElementPrimed) {
    audioElementPrimed = true;
    const prevMuted = audio.muted;
    audio.muted = true;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = prevMuted;
      }).catch(() => {
        audio.muted = prevMuted;
        audioElementPrimed = false;
      });
    } else {
      audio.muted = prevMuted;
    }
  }
}

function playFallbackWebAudioChime(): void {
  try {
    const ctx = getUnlockedAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    // Modern warm 3-note harmonic bell chime (C6 -> E6 -> G6)
    const notes = [
      { freq: 1046.5, start: 0, dur: 0.16, vol: 0.16 },
      { freq: 1318.51, start: 0.09, dur: 0.18, vol: 0.16 },
      { freq: 1567.98, start: 0.18, dur: 0.34, vol: 0.18 },
    ];

    for (const n of notes) {
      const oscMain = ctx.createOscillator();
      const oscHarm = ctx.createOscillator();
      const gain = ctx.createGain();

      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(n.freq, now + n.start);

      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(n.freq * 2, now + n.start);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.25, now + n.start);

      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(n.vol, now + n.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

      oscMain.connect(gain);
      oscHarm.connect(harmGain);
      harmGain.connect(gain);
      gain.connect(ctx.destination);

      oscMain.start(now + n.start);
      oscMain.stop(now + n.start + n.dur + 0.02);
      oscHarm.start(now + n.start);
      oscHarm.stop(now + n.start + n.dur + 0.02);
    }
  } catch {
    // Ignore audio errors when browser blocks playback
  }
}

export function playChatRingSound(): void {
  try {
    if (typeof window !== 'undefined') {
      if (!sharedChatAudio) {
        sharedChatAudio = new Audio('/sounds/chat-notification.mp3');
        sharedChatAudio.preload = 'auto';
        sharedChatAudio.volume = 0.85;
      }
      sharedChatAudio.currentTime = 0;
      const playPromise = sharedChatAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          playFallbackWebAudioChime();
        });
      }
      return;
    }
  } catch {
    playFallbackWebAudioChime();
  }
}
