import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
}

// Global singleton audio elements to prevent duplicate playback across components
let globalBackgroundMusic: HTMLAudioElement | null = null;
let globalSoundEffects: { [key: string]: HTMLAudioElement } = {};
const SOUND_SOURCES: Record<string, string> = {
  gameOver: '/audio/game-over-sound.mp3',
  passLocker: '/audio/passlocker.mp3',
  collectBook: '/audio/collectbook.mp3',
  tapFlap: '/audio/tapflapsound.mp3',
  defeat: '/audio/defeatsound.mp3',
  click: '/audio/clicksound.mp3',
  powerup: '/audio/powerup.mp3',
};

export const useAudio = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    volume: 0.5,
    isMuted: false,
    isPlaying: true // Start with music playing by default
  });

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const tapPoolRef = useRef<HTMLAudioElement[]>([]);
  const tapPoolIndexRef = useRef(0);
  // WebAudio (iOS-optimized) for ultra-low-latency tap sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tapBufferRef = useRef<AudioBuffer | null>(null);
  const tapGainRef = useRef<GainNode | null>(null);
  // Initialize audio elements (singleton across app)
  useEffect(() => {
    // Create global background music if needed
    if (!globalBackgroundMusic) {
      const audio = new Audio();
      audio.src = `/audio/main-menu-music.mp3?v=${Date.now()}`;
      audio.loop = true;
      audio.preload = 'metadata'; // Changed from 'auto' to prevent autoload
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.5 * 0.3; // initial volume, will sync below
      audio.autoplay = false; // Explicitly disable autoplay
      globalBackgroundMusic = audio;
      audio.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
      });
      audio.addEventListener('error', (e) => {
        console.warn('Background music failed to load:', e);
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      });
      
      // Auto-start music when loaded
      audio.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
        // Start playing automatically on first load
        audio.play().catch(error => {
          if (error.name !== 'NotAllowedError') {
            console.warn('Auto-play failed:', error);
          }
          setAudioState(prev => ({ ...prev, isPlaying: false }));
        });
      }, { once: true });
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
        gameOver: new Audio('/audio/game-over-sound.mp3'),
        passLocker: new Audio('/audio/passlocker.mp3'),
        collectBook: new Audio('/audio/collectbook.mp3'),
        tapFlap: new Audio('/audio/tapflapsound.mp3'),
        defeat: new Audio('/audio/defeatsound.mp3'),
        click: new Audio('/audio/clicksound.mp3'),
        powerup: new Audio('/audio/powerup.mp3')
      };
      Object.values(globalSoundEffects).forEach(a => {
        a.volume = audioState.volume;
        a.preload = 'metadata'; // Changed from 'auto' to prevent autoload
        a.crossOrigin = 'anonymous';
        a.autoplay = false; // Explicitly disable autoplay
        a.addEventListener('error', (e) => {
          console.warn('Sound effect failed to load:', e);
        });
        // Don't auto-load sound effects
      });

      // Prewarm a small pool for the tap sound on iOS to avoid seek/decode jank
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
      if (isiOS && tapPoolRef.current.length === 0) {
        const poolSize = 6;
        for (let i = 0; i < poolSize; i++) {
          const a = new Audio('/audio/tapflapsound.mp3');
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

    // iOS WebAudio: prepare on first user interaction to cache tap sound and avoid decode/seek jank
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    let onFirstInteraction: ((e: Event) => void) | null = null;
    if (isiOS) {
      onFirstInteraction = async () => {
        try {
          if (!audioCtxRef.current) {
            const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
            const ctx = new Ctx();
            audioCtxRef.current = ctx;
            const gain = ctx.createGain();
            gain.gain.value = audioState.isMuted ? 0 : audioState.volume;
            gain.connect(ctx.destination);
            tapGainRef.current = gain;
          }
          // Resume if needed
          if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          // Fetch & decode once
          if (!tapBufferRef.current) {
            const res = await fetch('/audio/tapflapsound.mp3');
            const arr = await res.arrayBuffer();
            const ctx = audioCtxRef.current!;
            tapBufferRef.current = await new Promise<AudioBuffer>((resolve, reject) => {
              ctx.decodeAudioData(arr.slice(0), resolve, reject);
            });
          }
        } catch (e) {
          console.warn('WebAudio init failed', e);
        }
      };
      window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
    }

    return () => {
      // Detach per-hook listeners only (do not destroy global audio)
      backgroundMusicRef.current?.removeEventListener('play', onPlay);
      backgroundMusicRef.current?.removeEventListener('pause', onPause);
      backgroundMusicRef.current?.removeEventListener('ended', onEnded);
      if (onFirstInteraction) {
        window.removeEventListener('pointerdown', onFirstInteraction as any);
      }
    };
  }, []);

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
    // Sync WebAudio gain for iOS tap sound
    if (tapGainRef.current) {
      tapGainRef.current.gain.value = audioState.isMuted ? 0 : audioState.volume;
    }
  }, [audioState.volume, audioState.isMuted]);

  const setVolume = useCallback((volume: number) => {
    setAudioState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const toggleMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const playBackgroundMusic = useCallback(async () => {
    const audio = backgroundMusicRef.current;
    // If no audio or already playing, do nothing
    if (!audio || !audio.paused) return;

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

    // iOS WebAudio path for ultra-low-latency tap sound
    if (soundName === 'tapFlap' && audioCtxRef.current && tapBufferRef.current && audioCtxRef.current.state === 'running') {
      try {
        const ctx = audioCtxRef.current;
        const src = ctx!.createBufferSource();
        src.buffer = tapBufferRef.current;
        if (tapGainRef.current) {
          src.connect(tapGainRef.current);
        } else {
          src.connect(ctx!.destination);
        }
        src.start(0);
      } catch {}
      return;
    }

    // Fallback: prewarmed HTMLAudio pool for iOS, or normal audio elements
    if (soundName === 'tapFlap' && tapPoolRef.current.length) {
      const a = tapPoolRef.current[tapPoolIndexRef.current];
      tapPoolIndexRef.current = (tapPoolIndexRef.current + 1) % tapPoolRef.current.length;
      try {
        a.currentTime = 0;
        a.volume = audioState.volume;
        a.muted = audioState.isMuted;
        a.play().catch(() => {});
      } catch {}
      return;
    }

    const sound = soundEffectsRef.current[soundName];
    if (sound) {
      // Reset to beginning for instant playback
      sound.currentTime = 0;
      sound.volume = audioState.volume;
      sound.play().catch(() => {});
    }
  }, [audioState.isMuted, audioState.volume]);

  return {
    volume: audioState.volume,
    isMuted: audioState.isMuted,
    isPlaying: audioState.isPlaying,
    setVolume,
    toggleMute,
    playBackgroundMusic,
    stopBackgroundMusic,
    playSound
  };
};