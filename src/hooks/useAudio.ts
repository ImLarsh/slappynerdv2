import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
}

// Global singleton audio elements to prevent duplicate playback across components
let globalBackgroundMusic: HTMLAudioElement | null = null;
let globalSoundEffects: { [key: string]: HTMLAudioElement } = {};

export const useAudio = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    volume: 0.5,
    isMuted: false,
    isPlaying: false
  });

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Initialize audio elements (singleton across app)
  useEffect(() => {
    // Create global background music if needed
    if (!globalBackgroundMusic) {
      const audio = new Audio();
      audio.src = `/audio/main-menu-music.mp3?v=${Date.now()}`;
      audio.loop = true;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.5 * 0.3; // initial volume, will sync below
      globalBackgroundMusic = audio;
      audio.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
      });
      audio.addEventListener('error', (e) => {
        console.warn('Background music failed to load:', e);
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      });
      audio.load();
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
        collectBook: new Audio('/audio/collectbook.mp3')
      };
      Object.values(globalSoundEffects).forEach(a => {
        a.volume = audioState.volume;
        a.preload = 'auto';
        a.crossOrigin = 'anonymous';
        a.addEventListener('error', (e) => {
          console.warn('Sound effect failed to load:', e);
        });
        a.load();
      });
    }
    // Point local ref to global effects
    soundEffectsRef.current = globalSoundEffects;

    return () => {
      // Detach per-hook listeners only (do not destroy global audio)
      backgroundMusicRef.current?.removeEventListener('play', onPlay);
      backgroundMusicRef.current?.removeEventListener('pause', onPause);
      backgroundMusicRef.current?.removeEventListener('ended', onEnded);
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
    
    const sound = soundEffectsRef.current[soundName];
    if (sound) {
      // Reset to beginning for instant playback
      sound.currentTime = 0;
      sound.volume = audioState.volume;
      sound.play().catch(console.error);
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