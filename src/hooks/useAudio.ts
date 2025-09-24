import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
}

export const useAudio = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    volume: 0.5,
    isMuted: false,
    isPlaying: false
  });

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Initialize audio elements
  useEffect(() => {
    // Background music - ensure proper loading
    const audio = new Audio();
    audio.src = `/audio/main-menu-music.mp3?v=${Date.now()}`;
    audio.loop = true;
    audio.volume = audioState.volume * 0.3;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    backgroundMusicRef.current = audio;

    // Sound effects
    soundEffectsRef.current = {
      gameOver: new Audio('/audio/game-over-sound.mp3'),
      passLocker: new Audio('/audio/passlocker.mp3'),
      collectBook: new Audio('/audio/collectbook.mp3')
    };

    // Set volume and properties for all sound effects
    Object.values(soundEffectsRef.current).forEach(audio => {
      audio.volume = audioState.volume;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
    });

    // Load audio files with better error handling and status sync
    if (backgroundMusicRef.current) {
      const onPlay = () => setAudioState(prev => ({ ...prev, isPlaying: true }));
      const onPause = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
      const onEnded = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
      
      backgroundMusicRef.current.addEventListener('play', onPlay);
      backgroundMusicRef.current.addEventListener('pause', onPause);
      backgroundMusicRef.current.addEventListener('ended', onEnded);
      backgroundMusicRef.current.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
      });
      backgroundMusicRef.current.addEventListener('error', (e) => {
        console.warn('Background music failed to load:', e);
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      });
      // Force reload after source change
      backgroundMusicRef.current.load();
    }
    
    Object.values(soundEffectsRef.current).forEach(audio => {
      audio.addEventListener('error', (e) => {
        console.warn('Sound effect failed to load:', e);
      });
      audio.load();
    });

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      Object.values(soundEffectsRef.current).forEach(audio => {
        audio.pause();
      });
      soundEffectsRef.current = {};
    };
  }, []); // Remove audioState dependency to prevent recreation

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
    if (!audio || audioState.isPlaying) return;

    try {
      // Reset audio state
      if (!audio.paused) {
        audio.pause();
      }
      audio.currentTime = 0;
      
      // Ensure audio is loaded
      if (audio.readyState < 2) {
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve(void 0);
          };
          const onError = (e: any) => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(e);
          };
          audio.addEventListener('canplaythrough', onCanPlay);
          audio.addEventListener('error', onError);
          audio.load();
        });
      }
      
      // Set audio properties
      audio.muted = audioState.isMuted;
      audio.volume = audioState.isMuted ? 0 : audioState.volume * 0.3;
      
      // Attempt to play
      await audio.play();
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    } catch (error: any) {
      // Only warn for non-abort errors and user interaction required errors
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.warn('Background music play failed:', error);
      }
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [audioState.volume, audioState.isMuted, audioState.isPlaying]);

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