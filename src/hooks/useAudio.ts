import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
}

// Global singleton audio elements to prevent duplicate playback across components
let globalBackgroundMusic: HTMLAudioElement | null = null;
let globalSoundEffects: { [key: string]: HTMLAudioElement } = {};
// Flag to indicate autoplay started muted and needs unmute on first interaction
let needsUnmuteAfterAutoplay = false;
// Detect iOS for optimal audio format
const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);

const SOUND_SOURCES: Record<string, string> = {
  gameOver: '/audio/game-over-sound.mp3',
  passLocker: isiOS ? '/audio/passlocker.caf' : '/audio/passlocker.mp3',
  collectBook: isiOS ? '/audio/collectbook-2.caf' : '/audio/collectbook.mp3',
  tapFlap: '/audio/tapflapsound.mp3',
  defeat: isiOS ? '/audio/defeatsound.caf' : '/audio/defeatsound.mp3',
  click: '/audio/clicksound.mp3',
  powerup: isiOS ? '/audio/powerup.caf' : '/audio/powerup.mp3',
};

export const useAudio = () => {
  const [audioState, setAudioState] = useState<AudioState>(() => {
    // Load mute state from localStorage
    const savedMute = localStorage.getItem('audioMuted');
    const savedVolume = localStorage.getItem('audioVolume');
    return {
      volume: savedVolume ? parseFloat(savedVolume) : 0.5,
      isMuted: savedMute === 'true',
      isPlaying: false
    };
  });

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const tapPoolRef = useRef<HTMLAudioElement[]>([]);
  const tapPoolIndexRef = useRef(0);

  // Initialize audio elements (singleton across app)
  useEffect(() => {
    // Create global background music if needed
    if (!globalBackgroundMusic) {
      const audio = new Audio();
      audio.src = `/audio/main-menu-music.mp3?v=${Date.now()}`;
      audio.loop = true;
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';
      audio.volume = (audioState.isMuted ? 0 : audioState.volume) * 0.3;
      audio.muted = audioState.isMuted;
      audio.autoplay = false;
      globalBackgroundMusic = audio;
      audio.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
      });
      audio.addEventListener('error', (e) => {
        console.warn('Background music failed to load:', e);
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      });
      
      // Try to autoplay; if blocked, try muted autoplay and unmute on first interaction
      setTimeout(async () => {
        if (!globalBackgroundMusic) return;
        try {
          globalBackgroundMusic.muted = audioState.isMuted;
          globalBackgroundMusic.volume = audioState.isMuted ? 0 : audioState.volume * 0.3;
          await globalBackgroundMusic.play();
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
            try {
              globalBackgroundMusic.muted = true;
              await globalBackgroundMusic.play();
              if (!audioState.isMuted) {
                needsUnmuteAfterAutoplay = true;
              }
            } catch {}
          }
        }
      }, 0);
    }
    // Point local ref to global instance
    backgroundMusicRef.current = globalBackgroundMusic;

    // Attach per-hook listeners so local state reflects global audio
    const onPlay = () => setAudioState(prev => ({ ...prev, isPlaying: true }));
    const onPause = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
    const onEnded = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
    backgroundMusicRef.current?.addEventListener('play', onPlay);
    backgroundMusicRef.current?.addEventListener('pause', onPause);
    backgroundMusicRef.current?.addEventListener('ended', onEnded);

    // Create global sound effects if needed
    if (Object.keys(globalSoundEffects).length === 0) {
      globalSoundEffects = {
        gameOver: new Audio(SOUND_SOURCES.gameOver),
        passLocker: new Audio(SOUND_SOURCES.passLocker),
        collectBook: new Audio(SOUND_SOURCES.collectBook),
        tapFlap: new Audio(SOUND_SOURCES.tapFlap),
        defeat: new Audio(SOUND_SOURCES.defeat),
        click: new Audio(SOUND_SOURCES.click),
        powerup: new Audio(SOUND_SOURCES.powerup)
      };
      Object.values(globalSoundEffects).forEach(a => {
        a.volume = audioState.isMuted ? 0 : audioState.volume;
        a.muted = audioState.isMuted;
        a.preload = 'metadata';
        a.crossOrigin = 'anonymous';
        a.autoplay = false;
        a.addEventListener('error', (e) => {
          console.warn('Sound effect failed to load:', e);
        });
      });

      // Prewarm a small pool for the tap sound on iOS to avoid seek/decode jank
      if (isiOS && tapPoolRef.current.length === 0) {
        const poolSize = 6;
        for (let i = 0; i < poolSize; i++) {
          const a = new Audio(SOUND_SOURCES.tapFlap); // Use CAF on iOS
          a.preload = 'auto';
          a.crossOrigin = 'anonymous';
          a.autoplay = false;
          a.volume = audioState.isMuted ? 0 : audioState.volume;
          // Kick off loading early
          try { a.load(); } catch {}
          tapPoolRef.current.push(a);
        }
      }
    }
    // Point local ref to global effects
    soundEffectsRef.current = globalSoundEffects;

    return () => {
      // Detach per-hook listeners only (do not destroy global audio)
      backgroundMusicRef.current?.removeEventListener('play', onPlay);
      backgroundMusicRef.current?.removeEventListener('pause', onPause);
      backgroundMusicRef.current?.removeEventListener('ended', onEnded);
    };
  }, [audioState.isMuted, audioState.volume]); // Re-run when mute/volume changes

  // Update volume when state changes
  useEffect(() => {
    if (backgroundMusicRef.current) {
      const newVolume = audioState.isMuted ? 0 : audioState.volume * 0.3;
      backgroundMusicRef.current.volume = newVolume;
      // Also update muted property for better browser support
      backgroundMusicRef.current.muted = audioState.isMuted;
    }
    Object.values(soundEffectsRef.current).forEach(audio => {
      audio.volume = audioState.isMuted ? 0 : audioState.volume;
      audio.muted = audioState.isMuted;
    });
    // Sync pool volumes too
    if (tapPoolRef.current.length) {
      for (const a of tapPoolRef.current) {
        a.volume = audioState.isMuted ? 0 : audioState.volume;
        a.muted = audioState.isMuted;
      }
    }
  }, [audioState.volume, audioState.isMuted]);

  const setVolume = useCallback((volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('audioVolume', newVolume.toString());
    setAudioState(prev => ({ ...prev, volume: newVolume }));
  }, []);

  const toggleMute = useCallback(() => {
    setAudioState(prev => {
      const newMuted = !prev.isMuted;
      // Save mute state to localStorage
      localStorage.setItem('audioMuted', newMuted.toString());
      // Apply immediately to all audio elements
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.muted = newMuted;
        if (newMuted) backgroundMusicRef.current.pause();
      }
      Object.values(soundEffectsRef.current).forEach(a => {
        a.muted = newMuted;
        if (newMuted) a.pause();
      });
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const playBackgroundMusic = useCallback(async () => {
    const audio = backgroundMusicRef.current;
    // If no audio, already playing, or muted, handle appropriately
    if (!audio) return;
    if (!audio.paused) return;
    if (audioState.isMuted) {
      setAudioState(prev => ({ ...prev, isPlaying: true }));
      return;
    }

    try {
      // Load audio if not loaded yet
      if (audio.readyState < 2) {
        audio.load();
        await new Promise(resolve => {
          const onLoad = () => {
            audio.removeEventListener('canplaythrough', onLoad);
            resolve(void 0);
          };
          audio.addEventListener('canplaythrough', onLoad);
        });
      }
      
      // Ensure properties are synced
      audio.muted = audioState.isMuted;
      audio.volume = audioState.isMuted ? 0 : audioState.volume * 0.3;
      await audio.play();
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    } catch (error: any) {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.warn('Background music play failed:', error);
      }
    }
  }, [audioState.volume, audioState.isMuted]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && audioState.isPlaying) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [audioState.isPlaying]);

  const playSound = useCallback((soundName: string) => {
    if (audioState.isMuted) return;

    const sound = soundEffectsRef.current[soundName];
    if (sound) {
      // Reset to beginning for instant playback
      sound.currentTime = 0;
      sound.volume = audioState.volume;
      sound.muted = audioState.isMuted;
      sound.play().catch(() => {});
    }
  }, [audioState.isMuted, audioState.volume]);

  // Auto-start background music on first user interaction (mobile-friendly)
  const startMusicOnInteraction = useCallback(() => {
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    if (needsUnmuteAfterAutoplay && !audioState.isMuted) {
      audio.muted = false;
      audio.volume = audioState.volume * 0.3;
      needsUnmuteAfterAutoplay = false;
    }

    if (!audioState.isMuted) {
      playBackgroundMusic();
    } else {
      // Ensure UI reflects playing state when muted autoplay is active
      if (!audio.paused) setAudioState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [audioState.isMuted, audioState.volume, playBackgroundMusic]);

  return {
    volume: audioState.volume,
    isMuted: audioState.isMuted,
    isPlaying: audioState.isPlaying,
    setVolume,
    toggleMute,
    playBackgroundMusic,
    stopBackgroundMusic,
    playSound,
    startMusicOnInteraction
  };
};