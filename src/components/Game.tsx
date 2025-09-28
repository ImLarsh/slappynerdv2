import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useCharactersContext } from '@/context/CharactersContext';
import { useAchievements } from '@/hooks/useAchievements';
import { useUserStats } from '@/hooks/useUserStats';
import { usePowers } from '@/hooks/usePowers';
import { useShopPowers } from '@/hooks/useShopPowers';
import { useCurrency } from '@/hooks/useCurrency';
import { useAudio } from '@/hooks/useAudio';
import { PowerSelection } from './PowerSelection';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/school-hallway-bg.webp';
import lockerYellow from '@/assets/locker-yellow.webp';
// Import all character images for the game
import nerdDefault from '@/assets/characters/nerd-default.png';
import coolNerd from '@/assets/characters/cool-nerd.png';
import coolNerd2 from '@/assets/characters/cool-nerd-2.png';
import alienNerd from '@/assets/characters/alien-nerd.png';
import robotNerd from '@/assets/characters/robot-nerd.png';
import pheonixNerd from '@/assets/characters/pheonixnerd.png';
import demonNerd from '@/assets/characters/demonnerd.png';
import demonNerd2 from '@/assets/characters/demonnerd-2.png';
import wizardNerd from '@/assets/characters/wizardnerd.png';
import defaultNerd from '@/assets/characters/defaultnerd.png';
import eagleNerd from '@/assets/characters/eaglenerd.png';
import owlNerd from '@/assets/characters/owlnerd.png';
import parrotNerd from '@/assets/characters/parrotnerd.png';
import flamingoNerd from '@/assets/characters/flamingonerd.png';
import peacockNerd from '@/assets/characters/peacocknerd.png';
import dragonNerd from '@/assets/characters/dragonnerd.png';
import unicornNerd from '@/assets/characters/unicornnerd.png';
import snailNerd from '@/assets/characters/snailnerd.png';
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Pipe extends GameObject {
  passed: boolean;
  lockerType: number; // 0, 1, or 2 for different locker images
}
interface Book {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  beingPulled?: boolean;
  pullStartTime?: number;
}
interface GameState {
  bird: GameObject & {
    velocity: number;
  };
  pipes: Pipe[];
  books: Book[];
  score: number;
  record: number;
  gameStarted: boolean;
  gameOver: boolean;
  gameEnded: boolean;
  lastPipeTime: number;
  crownCollected: boolean;
  isNewRecord: boolean;
  lastFrameTime: number;
  backgroundOffset: number;
  temporaryInvincibility?: number; // End time for temporary invincibility
}
const TARGET_FPS_MOBILE = 60;
const TARGET_FPS_DESKTOP = 80;
const getTargetFPS = () => window.innerWidth < 768 ? TARGET_FPS_MOBILE : TARGET_FPS_DESKTOP;
const FRAME_TIME = () => 1000 / getTargetFPS();
const GRAVITY = 0.65; // Slightly increased from 0.6
const JUMP_FORCE = -9.2; // Slightly reduced from -9.4
const PIPE_WIDTH = 80;
const BASE_PIPE_GAP = 270; // Slightly reduced from 280
const MIN_PIPE_GAP = 170; // Slightly reduced from 180
const LOCKER_WIDTH = 220;
const PIPE_SPEED = 2.7; // Slightly increased from 2.5
const PIPE_GAP = 210; // Slightly reduced from 220
const BIRD_SIZE = 50;
export const Game: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const {
    submitScore
  } = useLeaderboard();
  const {
    stats,
    updateGameStats
  } = useUserStats();
  const {
    selectedCharacter
  } = useCharactersContext();
  const {
    checkAchievements
  } = useAchievements();
  const {
    user
  } = useAuth();
  const {
    addBooks
  } = useCurrency();
  const {
    toast
  } = useToast();
  const {
    playSound
  } = useAudio();
  const {
    showPowerSelection,
    getRandomPowers,
    addPower,
    checkPowerSelection,
    getGameModifiers,
    resetPowers,
    setShowPowerSelection
  } = usePowers(playSound);
  const {
    startGamePowers,
    hasStartShield,
    hasBookMagnet,
    hasDoublePoints,
    hasGhostMode,
    hasLuckyStart,
    onBookSeen,
    shouldAutoCollectBook,
    updateActivePowers,
    removeShieldMode,
    activePowers: shopActivePowers
  } = useShopPowers();

  // Track whether the game is currently running to avoid resize-induced jank
  const isPlayingRef = useRef(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const lockerImagesRef = useRef<HTMLImageElement[]>([]);
  const nextBookIdRef = useRef(0);
  
  // Preload all character images to prevent flickering
  const characterImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // Queue jumps to process inside rAF to avoid per-tap React state updates on iOS
  const pendingJumpsRef = useRef(0);
  // Pre-scaled background tile canvas to avoid per-frame scaling cost (iOS jank)
  const backgroundTileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // iOS detection and delta smoothing to eliminate per-tap micro-jank
  const isiOSRef = useRef<boolean>(/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const smoothedDeltaRef = useRef<number>(1000 / TARGET_FPS_MOBILE);
  const [gameState, setGameState] = useState<GameState>({
    bird: {
      x: 100,
      y: 200,
      width: BIRD_SIZE,
      height: BIRD_SIZE,
      velocity: 0
    },
    pipes: [],
    books: [],
    score: 0,
    record: 0,
    gameStarted: false,
    gameOver: false,
    gameEnded: false,
    lastPipeTime: 0,
    crownCollected: false,
    isNewRecord: false,
    lastFrameTime: performance.now(),
    backgroundOffset: 0
  });
  const [canvasSize, setCanvasSize] = useState({
    width: 800,
    height: 600
  });
  const [powerChoices, setPowerChoices] = useState(() => getRandomPowers(hasLuckyStart()));
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [pendingPower, setPendingPower] = useState<any>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [bgReady, setBgReady] = useState(false);

  // Load background image, locker images and get user record on component mount

  useEffect(() => {
    // Prevent body scrolling on mobile when game is active
    document.body.classList.add('game-active');

    // Load background image
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => {
      setBgReady(true);
    };
    img.onerror = e => console.error('Background failed to load:', e);
    img.src = bgImage;
    backgroundImageRef.current = img;

    // Load locker image (only yellow) with error handling
    const lockerImg = new Image();
    lockerImg.decoding = 'sync';
    lockerImg.onload = () => {};
    lockerImg.onerror = e => console.error('Yellow locker failed to load:', e);
    lockerImg.src = lockerYellow;
    lockerImagesRef.current[0] = lockerImg;

    // Preload all character images to prevent flickering
    const imageMap: Record<string, any> = {
      'src/assets/characters/nerd-default.png': nerdDefault,
      'src/assets/characters/cool-nerd.png': coolNerd,
      'src/assets/characters/cool-nerd-2.png': coolNerd2,
      'src/assets/characters/alien-nerd.png': alienNerd,
      'src/assets/characters/robot-nerd.png': robotNerd,
      'src/assets/characters/pheonixnerd.png': pheonixNerd,
      'src/assets/characters/demonnerd.png': demonNerd,
      'src/assets/characters/demonnerd-2.png': demonNerd2,
      'src/assets/characters/wizardnerd.png': wizardNerd,
      'src/assets/characters/defaultnerd.png': defaultNerd,
      'src/assets/characters/eaglenerd.png': eagleNerd,
      'src/assets/characters/owlnerd.png': owlNerd,
      'src/assets/characters/parrotnerd.png': parrotNerd,
      'src/assets/characters/flamingonerd.png': flamingoNerd,
      'src/assets/characters/peacocknerd.png': peacockNerd,
      'src/assets/characters/dragonnerd.png': dragonNerd,
      'src/assets/characters/unicornnerd.png': unicornNerd,
      'src/assets/characters/snailnerd.png': snailNerd,
    };

    // Preload all character images
    Object.entries(imageMap).forEach(([path, src]) => {
      const img = new Image();
      img.decoding = 'sync';
      img.src = src;
      characterImagesRef.current.set(path, img);
    });

    // Cleanup function
    return () => {
      document.body.classList.remove('game-active');
    };
  }, []);

  // Prepare pre-scaled background tile whenever bg is ready or canvas size changes
  useEffect(() => {
    const img = backgroundImageRef.current;
    const canvasW = canvasSize.width;
    const canvasH = canvasSize.height;
    if (!img || !img.complete || canvasW <= 0 || canvasH <= 0) return;
    const scale = Math.max(canvasW / img.width, canvasH / img.height);
    const scaledWidth = Math.ceil(img.width * scale);
    const scaledHeight = Math.ceil(img.height * scale);
    const tile = document.createElement('canvas');
    tile.width = scaledWidth;
    tile.height = scaledHeight;
    const tctx = tile.getContext('2d');
    if (!tctx) return;
    tctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    backgroundTileCanvasRef.current = tile;
  }, [bgReady, canvasSize.width, canvasSize.height]);

  // Set responsive canvas size with safety checks
  useEffect(() => {
    const updateCanvasSize = () => {
      // Avoid jank from mobile browser chrome expanding/collapsing while playing
      if (isPlayingRef.current) return;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const isMobile = vw < 768;
      const isTinyMobile = vw < 400;
      let width: number, height: number;
      if (isTinyMobile) {
        width = Math.min(vw - 16, 420); // Account for padding
        height = Math.min(vh - 100, 720); // Account for UI elements
      } else if (isMobile) {
        // Fill more of the screen on mobile
        width = Math.min(vw - 16, 500); // Account for padding
        height = Math.min(vh - 100, 820); // Account for UI elements
      } else {
        // Desktop - reduced game canvas size (height reduced more)
        width = 1200;
        height = 650;
      }

      // Ensure minimum sizes for playability
      width = Math.max(300, width);
      height = Math.max(400, height);
      setCanvasSize({
        width: Math.round(width),
        height: Math.round(height)
      });
    };

    // Initial size
    updateCanvasSize();

    // Add event listeners with passive option for better performance
    const resizeOptions = {
      passive: true
    };
    window.addEventListener('resize', updateCanvasSize, resizeOptions);
    window.addEventListener('orientationchange', updateCanvasSize, resizeOptions);
    window.visualViewport?.addEventListener('resize', updateCanvasSize, resizeOptions);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
      window.visualViewport?.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Update record when user changes (fixed infinite loop)
  useEffect(() => {
    const playerBestScore = stats.best_score;
    setGameState(prev => {
      if (prev.record !== playerBestScore) {
        return {
          ...prev,
          record: playerBestScore
        };
      }
      return prev;
    });
  }, [user]); // Only depend on user, not the function

  // Keep a stable flag for playing state to prevent resize jank
  useEffect(() => {
    isPlayingRef.current = gameState.gameStarted && !gameState.gameOver;
  }, [gameState.gameStarted, gameState.gameOver]);
  const resetGame = useCallback(() => {
    const currentRecord = stats.best_score;
    const now = Date.now();
    resetPowers(); // Reset powers when starting new game
    startGamePowers(); // Activate shop powers for new game
    setGameStartTime(now);
    setGameState(prev => ({
      bird: {
        x: 100,
        y: canvasSize.height / 3,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
        velocity: 0
      },
      pipes: [],
      books: [],
      score: 0,
      record: currentRecord,
      gameStarted: true,
      gameOver: false,
      gameEnded: false,
      lastPipeTime: 0,
      crownCollected: false,
      isNewRecord: false,
      lastFrameTime: performance.now(),
      backgroundOffset: 0
    }));
  }, [canvasSize.height, resetPowers, startGamePowers]);
  const jump = useCallback(() => {
    // Don't allow jumping during power selection
    if (showPowerSelection) return;

    // Handle tap to continue after power selection
    if (waitingForContinue && pendingPower) {
      // Activate the pending power
      const now = Date.now();
      const activePower = {
        ...pendingPower,
        startTime: now,
        endTime: pendingPower.effect.duration ? now + pendingPower.effect.duration : undefined
      };
      addPower(activePower);

      // Grant 1 second of temporary invincibility to prevent instant death from the hop
      setGameState(prev => ({
        ...prev,
        temporaryInvincibility: performance.now() + 1000 // Use performance.now() for consistency
      }));

      // Clear the waiting state
      setWaitingForContinue(false);
      setPendingPower(null);
      // Don't return here - let the character jump too!
    }

    // Avoid any default browser gesture side-effects on touch handled via pointer events
    if (!gameState.gameStarted) {
      resetGame(); // This will start the game and activate shop powers
    }
    if (!gameState.gameOver) {
      // Queue the jump; the game loop will apply it at the next frame
      pendingJumpsRef.current++;
      // Play tap sound when flapping
      requestAnimationFrame(() => playSound('tapFlap'));
    }
  }, [gameState.gameStarted, gameState.gameOver, showPowerSelection, resetGame, waitingForContinue, pendingPower, addPower]);

  // Optimized collision detection - remove stale closure dependency
  const checkCollision = useCallback((bird: GameObject, pipe: Pipe, currentGameState: GameState) => {
    // Check if player has temporary invincibility from power selection
    const now = performance.now();
    if (currentGameState.temporaryInvincibility && now < currentGameState.temporaryInvincibility) {
      return false; // No collision while temporarily invincible
    }

    // Check if player has ghost mode active (20-second time-based protection - go through objects)
    if (hasGhostMode()) {
      updateActivePowers(gameStartTime);
      return false; // No collision while ghost mode is active
    }

    // Normal collision detection - reduced hitboxes for more forgiving gameplay
    const emojiMargin = BIRD_SIZE * 0.3; // Increased margin for more forgiving collision
    const lockerHorizontalMargin = Math.max(60, LOCKER_WIDTH * 0.4); // Increased margin for more forgiving collision
    const lockerVerticalMargin = 15; // Increased margin for more forgiving collision

    const isColliding = bird.x + emojiMargin < pipe.x + pipe.width - lockerHorizontalMargin && bird.x + bird.width - emojiMargin > pipe.x + lockerHorizontalMargin && bird.y + emojiMargin < pipe.y + pipe.height - lockerVerticalMargin && bird.y + bird.height - emojiMargin > pipe.y + lockerVerticalMargin;

    // If there's a collision and player has shield mode available, demolish the obstacle
    if (isColliding && hasStartShield()) {
      removeShieldMode(); // Remove shield mode permanently after use
      // Defer toast to avoid render-phase updates (prevents React warning and jank)
      setTimeout(() => {
        toast({
          title: "Shield Mode Activated! 🛡️",
          description: "You demolished the obstacle!"
        });
      }, 0);

      // Mark this pipe for removal by setting a special flag
      (pipe as any).shouldBeRemoved = true;
      return false; // No collision damage - obstacle is demolished
    }
    return isColliding;
  }, [hasGhostMode, updateActivePowers, gameStartTime, hasStartShield, removeShieldMode, toast]);
  const spawnBook = useCallback((pipes: Pipe[] = []) => {
    // Find safe Y positions by checking where pipes are NOT
    const safeAreas: {
      start: number;
      end: number;
    }[] = [];

    // Start with the full canvas height as one big safe area
    let occupiedRanges: {
      start: number;
      end: number;
    }[] = [];

    // Check nearby pipes that could interfere with book spawning
    const nearbyPipes = pipes.filter(pipe => pipe.x > canvasSize.width - 300 && pipe.x < canvasSize.width + 400);

    // For each pipe, add its occupied Y range to the list
    for (const pipe of nearbyPipes) {
      occupiedRanges.push({
        start: pipe.y,
        end: pipe.y + pipe.height
      });
    }

    // Sort occupied ranges by start position
    occupiedRanges.sort((a, b) => a.start - b.start);

    // Merge overlapping ranges
    const mergedRanges: {
      start: number;
      end: number;
    }[] = [];
    for (const range of occupiedRanges) {
      if (mergedRanges.length === 0 || mergedRanges[mergedRanges.length - 1].end < range.start) {
        mergedRanges.push(range);
      } else {
        mergedRanges[mergedRanges.length - 1].end = Math.max(mergedRanges[mergedRanges.length - 1].end, range.end);
      }
    }

    // Find gaps between occupied ranges as safe areas
    let currentY = 80; // Start with some padding from top
    const maxY = canvasSize.height - 80; // End with some padding from bottom

    for (const occupiedRange of mergedRanges) {
      // Add safe area before this occupied range (with padding)
      if (currentY < occupiedRange.start - 40) {
        safeAreas.push({
          start: currentY,
          end: occupiedRange.start - 40
        });
      }
      // Move past this occupied range (with padding)
      currentY = Math.max(currentY, occupiedRange.end + 40);
    }

    // Add remaining safe area after all occupied ranges
    if (currentY < maxY) {
      safeAreas.push({
        start: currentY,
        end: maxY
      });
    }

    // If no safe areas found (very unlikely), try to spawn in the largest gap
    if (safeAreas.length === 0) {
      // Find the largest gap between pipes and use it anyway
      let largestGap = {
        start: 80,
        end: canvasSize.height - 80,
        size: canvasSize.height - 160
      };
      for (let i = 0; i < mergedRanges.length - 1; i++) {
        const gapStart = mergedRanges[i].end;
        const gapEnd = mergedRanges[i + 1].start;
        const gapSize = gapEnd - gapStart;
        if (gapSize > largestGap.size && gapSize > 60) {
          largestGap = {
            start: gapStart + 20,
            end: gapEnd - 20,
            size: gapSize - 40
          };
        }
      }
      if (largestGap.size > 40) {
        safeAreas.push({
          start: largestGap.start,
          end: largestGap.end
        });
      } else {
        // Don't spawn book if no safe space
        return;
      }
    }

    // Pick a random safe area and position within it
    const randomArea = safeAreas[Math.floor(Math.random() * safeAreas.length)];
    const safeY = randomArea.start + Math.random() * (randomArea.end - randomArea.start);
    const newBook: Book = {
      id: `book_${nextBookIdRef.current++}`,
      x: canvasSize.width + Math.random() * 200,
      // Spawn ahead of the player
      y: safeY,
      collected: false
    };
    setGameState(prev => ({
      ...prev,
      books: [...prev.books, newBook]
    }));
  }, [canvasSize]);
  const checkBookCollisions = useCallback((bird: GameObject, books: Book[]): {
    updatedBooks: Book[];
    booksCollected: number;
  } => {
    let booksCollected = 0;
    const updatedBooks = books.map(book => {
      if (book.collected) return book;

      // Use stable book id
      const bookId = book.id;

      // Track when book is first seen (for auto-collection)
      onBookSeen(bookId);
      const distance = Math.sqrt(Math.pow(book.x - (bird.x + bird.width / 2), 2) + Math.pow(book.y - (bird.y + bird.height / 2), 2));

      // Check collection logic
      let shouldCollect = false;
      let shouldStartPull = false;
      if (hasBookMagnet()) {
        // If player has book magnet, start pulling after 1-second delay
        if (shouldAutoCollectBook(bookId) && !book.beingPulled) {
          shouldStartPull = true;
        }
        // Collect when pulled book collides with character
        if (book.beingPulled && distance < bird.width * 0.8) {
          shouldCollect = true;
        }
      } else {
        // If no book magnet, collect on direct collision
        shouldCollect = distance < bird.width * 0.8;
      }
      if (shouldCollect && !book.collected) {
        booksCollected++;
        return {
          ...book,
          collected: true
        };
      }
      if (shouldStartPull) {
        return {
          ...book,
          beingPulled: true,
          pullStartTime: Date.now()
        };
      }
      return book;
    });
    return {
      updatedBooks,
      booksCollected
    };
  }, [onBookSeen, shouldAutoCollectBook, hasBookMagnet]);
  const gameLoop = useCallback((currentTime: number) => {
    if (!canvasRef.current || !gameState.gameStarted || gameState.gameOver || showPowerSelection || waitingForContinue) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get canvas context in game loop');
      return;
    }
    setGameState(prev => {
      const newState = {
        ...prev
      };
      const deltaTime = currentTime - newState.lastFrameTime;
      const isMobile = window.innerWidth < 768;
      const currentFrameTime = FRAME_TIME();
      const baseFrameTime = isMobile ? 1000 / TARGET_FPS_MOBILE : currentFrameTime;

      // Desktop: throttle to target FPS. Mobile: no cap (always update).
      if (!isMobile && deltaTime < currentFrameTime) {
        return newState;
      }

      // Clamp delta to avoid big jumps on tab switching/backgrounding
      const clampedDelta = Math.min(deltaTime, 50);

      // Get current power modifiers
      const modifiers = getGameModifiers();

      // Calculate frame multiplier with iOS-smoothed delta to avoid tap spikes
      let usedDelta = clampedDelta;
      if (isiOSRef.current) {
        const alpha = 0.08; // more aggressive smoothing for iOS
        const prev = smoothedDeltaRef.current ?? 1000 / TARGET_FPS_MOBILE;
        const smoothed = prev + alpha * (clampedDelta - prev);
        smoothedDeltaRef.current = smoothed;
        // Cap delta variations to prevent any remaining micro-jank
        usedDelta = Math.max(8, Math.min(smoothed, 25));
      }
      const frameMultiplier = usedDelta / baseFrameTime;
      newState.lastFrameTime = currentTime;

      // Clear expired temporary invincibility
      if (newState.temporaryInvincibility && currentTime >= newState.temporaryInvincibility) {
        newState.temporaryInvincibility = undefined;
      }

      // Apply pending jumps before physics to avoid setState in input handlers
      if (pendingJumpsRef.current > 0) {
        newState.bird.velocity = JUMP_FORCE;
        pendingJumpsRef.current = 0;
      }
      // Update bird physics with frame rate compensation
      newState.bird.velocity += GRAVITY * frameMultiplier;
      newState.bird.y += newState.bird.velocity * frameMultiplier;

      // Update background scrolling
      newState.backgroundOffset += PIPE_SPEED * modifiers.speedMultiplier * frameMultiplier;

      // Check ground/ceiling collision - game over when emoji completely falls off screen
      if (newState.bird.y > canvasSize.height || newState.bird.y + newState.bird.height < 0) {
        newState.gameOver = true;
        newState.gameEnded = true;

        // Play defeat sound
        playSound('defeat');

        // Update stats in database and get new totals
        if (user) {
          updateGameStats(newState.score).then(updatedStats => {
            if (updatedStats) {
              // Check achievements with updated stats
              checkAchievements({
                score: newState.score,
                gamesPlayed: updatedStats.total_games,
                highScore: updatedStats.best_score
              });
            }
          });

          // Submit score to leaderboard
          submitScore(newState.score, selectedCharacter?.id);
        }
        return newState;
      }

      // Generate pipes (adjust frequency for mobile performance and locker spam power)
      const basePipeFrequency = canvasSize.width < 500 ? 2200 : 1800; // Increased spawn rate further (reduced from 2500/2000)
      const hasLockerSpam = modifiers.activePowers.some(p => p.id === 'locker_spam');
      
      // Adjust pipe frequency based on speed to maintain consistent locker density
      const speedAdjustedFrequency = basePipeFrequency / modifiers.speedMultiplier; // Faster spawning when speed is higher
      const pipeFrequency = hasLockerSpam ? speedAdjustedFrequency * 0.5 : speedAdjustedFrequency; // Double spawn rate if locker spam is active

      // Prevent pipe spawning during power selection or right after power activation to avoid stacking
      const timeSinceLastPipe = currentTime - newState.lastPipeTime;
      const canSpawnPipe = timeSinceLastPipe > pipeFrequency && (!newState.temporaryInvincibility || currentTime > newState.temporaryInvincibility + 500);
      if (canSpawnPipe) {
        // Calculate gap size - only affected by gap-specific powers, not speed powers
        const gapPowers = modifiers.activePowers.filter(p => p.effect.gapMultiplier);
        const gapMultiplier = gapPowers.reduce((mult, power) => mult * power.effect.gapMultiplier!, 1);
        const gapStart = Math.random() * (canvasSize.height - PIPE_GAP * gapMultiplier - 100) + 50;
        const lockerType = 0; // Always use yellow locker
        // Position lockers from the right edge - ensure consistent spacing
        const lockerX = canvasSize.width + LOCKER_WIDTH + 10; // Add small buffer to prevent immediate collision

        // Ensure minimum gap size to prevent impossible passages
        const finalGapSize = Math.max(MIN_PIPE_GAP, PIPE_GAP * gapMultiplier);
        const finalGapStart = Math.max(60, Math.min(gapStart, canvasSize.height - finalGapSize - 60));

        // Only add pipes if they don't overlap with existing ones
        const wouldOverlap = newState.pipes.some(existingPipe => Math.abs(existingPipe.x - lockerX) < LOCKER_WIDTH + 50);
        if (!wouldOverlap) {
          newState.pipes.push({
            x: lockerX,
            y: 0,
            // Top locker starts from screen top
            width: LOCKER_WIDTH,
            height: finalGapStart,
            // Extends down to gap start
            passed: false,
            lockerType
          }, {
            x: lockerX,
            y: finalGapStart + finalGapSize,
            // Bottom locker starts after gap
            width: LOCKER_WIDTH,
            height: canvasSize.height - (finalGapStart + finalGapSize),
            // Extends to screen bottom
            passed: false,
            lockerType
          });
          newState.lastPipeTime = currentTime;

          // 5% chance to spawn a book with the new pipe
          if (Math.random() < 0.05) {
            // Use the existing gapStart calculation for safe spawn area
            const gapMiddle = finalGapStart + finalGapSize / 2;
            const safeY = gapMiddle + (Math.random() - 0.5) * (finalGapSize * 0.6); // Keep books in middle of gap

            const newBook: Book = {
              id: `book_${nextBookIdRef.current++}`,
              x: lockerX + LOCKER_WIDTH / 2,
              // Spawn at the same X position as the pipe gap
              y: Math.max(80, Math.min(safeY, canvasSize.height - 80)),
              // Ensure books stay in reachable area
              collected: false
            };
            newState.books.push(newBook);
          }
        }
      }

      // Update books first (before collision check)
      newState.books = newState.books.filter(book => {
        if (!book.collected) {
          if (book.beingPulled) {
            // Calculate pull force toward character
            const birdCenterX = newState.bird.x + newState.bird.width / 2;
            const birdCenterY = newState.bird.y + newState.bird.height / 2;
            const dx = birdCenterX - book.x;
            const dy = birdCenterY - book.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 5) {
              // Only pull if not too close
              // Normalize direction and apply pull speed (faster when farther)
              const pullSpeed = Math.min(12, 6 + distance * 0.1) * frameMultiplier;
              const normalizedDx = dx / distance;
              const normalizedDy = dy / distance;
              book.x += normalizedDx * pullSpeed;
              book.y += normalizedDy * pullSpeed;
            }
          } else {
            // Normal book movement (scroll with world)
            book.x -= PIPE_SPEED * modifiers.speedMultiplier * frameMultiplier;
          }
        }
        return book.x > -50 && !book.collected;
      });

      // Check book collisions after position updates
      const bookCollisionResult = checkBookCollisions(newState.bird, newState.books);
      newState.books = bookCollisionResult.updatedBooks;

      // Handle book collection side effects
      if (bookCollisionResult.booksCollected > 0) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          // Apply double points power if owned
          const booksToAdd = hasDoublePoints() ? bookCollisionResult.booksCollected * 2 : bookCollisionResult.booksCollected;
          addBooks(booksToAdd);
          playSound('collectBook');
          
          // Trigger powerup selection when book is collected
          setShowPowerSelection(true);
        }, 0);
      }

      // Update pipes with frame rate compensation
      newState.pipes = newState.pipes.filter(pipe => {
        // Remove pipes marked for demolition by Ghost Mode
        if ((pipe as any).shouldBeRemoved) {
          return false; // Remove this pipe completely
        }
        pipe.x -= PIPE_SPEED * modifiers.speedMultiplier * frameMultiplier;

        // Check scoring
        if (!pipe.passed && pipe.x + pipe.width < newState.bird.x) {
          pipe.passed = true;
          if (pipe.y === 0) {
            // Only count top pipes
            newState.score += 1;

            // Play pass locker sound effect
            playSound('passLocker');

            // Check if we need to show crown (only when beating personal best)
            const currentBest = stats.best_score;
            if (newState.score > currentBest && !newState.crownCollected) {
              newState.crownCollected = true;
            }
          }
        }

        // Check collision (skip if invincible from powers or temporary invincibility)
        const hasTemporaryInvincibility = newState.temporaryInvincibility && currentTime < newState.temporaryInvincibility;
        if (!modifiers.isInvincible && !hasTemporaryInvincibility && checkCollision(newState.bird, pipe, newState)) {
          newState.gameOver = true;
          newState.gameEnded = true;

          // Play defeat sound
          playSound('defeat');

          // Update stats in database and get new totals
          if (user) {
            updateGameStats(newState.score).then(updatedStats => {
              if (updatedStats) {
                // Check achievements with updated stats
                checkAchievements({
                  score: newState.score,
                  gamesPlayed: updatedStats.total_games,
                  highScore: updatedStats.best_score
                });
              }
            });

            // Submit score to leaderboard
            submitScore(newState.score, selectedCharacter?.id);
          }
        }

        // Remove pipes that should be demolished or have moved off screen
        return pipe.x > -pipe.width && !(pipe as any).shouldBeRemoved;
      });
      return newState;
    });
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getGameModifiers, checkPowerSelection, checkBookCollisions, addBooks, playSound, toast]);

  // Canvas drawing with error handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }

    // Ensure canvas size is valid
    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      console.error('Invalid canvas size:', canvasSize);
      return;
    }

    // Force canvas size update on mobile
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      console.log('Canvas size set to:', canvasSize);
    }
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) {
      console.error('Cannot get canvas context');
      return;
    }

    // Ensure canvas is visible - draw initial background
    ctx.fillStyle = 'hsl(200, 100%, 85%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scrolling background using pre-scaled tile to avoid per-frame scaling
    const tile = backgroundTileCanvasRef.current;
    if (tile) {
      const scaledWidth = tile.width;
      const scaledHeight = tile.height;
      const offsetY = (canvas.height - scaledHeight) / 2;
      const scrollOffset = gameState.backgroundOffset % scaledWidth;
      for (let i = -1; i <= Math.ceil(canvas.width / scaledWidth) + 1; i++) {
        ctx.drawImage(tile, i * scaledWidth - scrollOffset, offsetY);
      }
    } else if (backgroundImageRef.current && backgroundImageRef.current.complete) {
      const img = backgroundImageRef.current;
      const bgWidth = img.width;
      const bgHeight = img.height;
      const scaleX = canvas.width / bgWidth;
      const scaleY = canvas.height / bgHeight;
      const scale = Math.max(scaleX, scaleY);
      const scaledWidth = bgWidth * scale;
      const scaledHeight = bgHeight * scale;
      const offsetY = (canvas.height - scaledHeight) / 2;
      const scrollOffset = gameState.backgroundOffset % scaledWidth;
      for (let i = -1; i <= Math.ceil(canvas.width / scaledWidth) + 1; i++) {
        ctx.drawImage(img, i * scaledWidth - scrollOffset, offsetY, scaledWidth, scaledHeight);
      }
    } else {
      // Fallback: Clear canvas with sky gradient if image not loaded
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'hsl(200, 100%, 85%)');
      gradient.addColorStop(1, 'hsl(220, 100%, 92%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw lockers instead of pipes
    const EDGE_OVERDRAW = Math.max(24, Math.round(canvasSize.height * 0.03)); // extend offscreen to avoid top/bottom gaps
    gameState.pipes.forEach(pipe => {
      const lockerImage = lockerImagesRef.current[0]; // Always use yellow locker (index 0)

      if (lockerImage && lockerImage.complete) {
        const targetWidth = LOCKER_WIDTH;
        const targetHeight = pipe.height;
        const drawX = pipe.x;
        const drawY = pipe.y;

        // Check if this is a top locker (starts at y=0) and flip it
        const isTopLocker = pipe.y === 0;
        if (isTopLocker) {
          // Flip the top locker vertically
          ctx.save();
          ctx.scale(1, -1);
          ctx.drawImage(lockerImage, drawX, -drawY - targetHeight,
          // keep bottom aligned to gap start
          targetWidth, targetHeight + EDGE_OVERDRAW // extend upward offscreen to remove top gap
          );
          ctx.restore();
        } else {
          // Draw bottom locker normally, extend below screen to remove bottom gap
          ctx.drawImage(lockerImage, drawX, drawY, targetWidth, targetHeight + EDGE_OVERDRAW);
        }

        // Add a subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      } else {
        // Fallback: draw yellow rectangle if image not loaded
        ctx.fillStyle = '#FFD700'; // Yellow
        const isTopLocker = pipe.y === 0;
        const rectY = isTopLocker ? pipe.y - EDGE_OVERDRAW : pipe.y;
        const rectH = pipe.height + EDGE_OVERDRAW;
        ctx.fillRect(pipe.x, rectY, pipe.width, rectH);

        // Add border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, rectY, pipe.width, rectH);
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });

    // Draw books with bright yellow ring
    gameState.books.forEach(book => {
      if (!book.collected) {
        const bookSize = 32; // Increased from 24px

        // Draw bright yellow ring around book
        ctx.save();

        // Add extra glow effect for books being pulled
        if (book.beingPulled) {
          ctx.strokeStyle = '#00FF00'; // Green for being pulled
          ctx.lineWidth = 6;
          ctx.shadowColor = '#00FF00';
          ctx.shadowBlur = 12;

          // Draw pulsing effect
          const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
          ctx.globalAlpha = pulseIntensity;
        } else {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 8;
        }

        // Draw the glowing ring
        ctx.beginPath();
        ctx.arc(book.x + bookSize / 2, book.y - bookSize / 2, bookSize / 2 + 6, 0, 2 * Math.PI);
        ctx.stroke();

        // Reset shadow for the emoji
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;

        // Draw the book emoji larger
        ctx.font = `${bookSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📚', book.x + bookSize / 2, book.y - bookSize / 2);
        ctx.restore();
      }
    });

    // Draw selected character or default nerd emoji
    ctx.save();

    // Get shop power status for visual effects
    const hasActiveGhostMode = hasGhostMode();
    const hasActiveShield = hasStartShield();
    const hasActiveMagnet = hasBookMagnet();

    // Draw light blue circle for ghost mode (behind character)
    if (hasActiveGhostMode) {
      ctx.save();
      ctx.strokeStyle = '#87CEEB'; // Light blue
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([10, 10]); // Dotted line for ghost effect
      ctx.beginPath();
      ctx.arc(gameState.bird.x + gameState.bird.width / 2, gameState.bird.y + gameState.bird.height / 2, BIRD_SIZE * 0.85, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // Draw green outline for shield mode
    if (hasActiveShield) {
      ctx.save();
      ctx.strokeStyle = '#22C55E'; // Green
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(gameState.bird.x + gameState.bird.width / 2, gameState.bird.y + gameState.bird.height / 2, BIRD_SIZE * 0.8, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // Draw yellow glow for book magnet (behind character)
    if (hasActiveMagnet) {
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFD700';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(gameState.bird.x + gameState.bird.width / 2, gameState.bird.y + gameState.bird.height / 2, BIRD_SIZE * 0.8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.font = `${BIRD_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add subtle shadow for character
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    const character = selectedCharacter ? selectedCharacter.emoji : '🤓';
    const characterImagePath = selectedCharacter?.image_path;
    
    // Use character image if available, otherwise use emoji
    const getCharacterImage = () => {
      if (!characterImagePath) return null;
      
      // Get preloaded image from cache
      return characterImagesRef.current.get(characterImagePath) || null;
    };
    
    const characterImg = getCharacterImage();
    
    if (characterImg && (characterImg.complete || characterImg.naturalWidth > 0)) {
      // Clear previous shadow for image
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw the character image - significantly increased size for better visibility
      const imageSize = BIRD_SIZE * 2.0; // Increased from 1.8 to 2.0 for even larger character
      ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
      ctx.drawImage(
        characterImg, 
        gameState.bird.x + (gameState.bird.width - imageSize) / 2, 
        gameState.bird.y + (gameState.bird.height - imageSize) / 2, 
        imageSize, 
        imageSize
      );
    } else {
      // Use emoji fallback - increased size for better visibility
      ctx.font = `${BIRD_SIZE * 1.5}px Arial`; // Increased from 1.3 to 1.5 for larger emoji fallback
      ctx.fillText(character, gameState.bird.x + gameState.bird.width / 2, gameState.bird.y + gameState.bird.height / 2);
    }

    // Draw crown if beating personal best
    if (gameState.crownCollected) {
      ctx.font = `${BIRD_SIZE * 0.6}px Arial`;
      ctx.fillText('👑', gameState.bird.x + gameState.bird.width / 2, gameState.bird.y - 15);
    }
    ctx.restore();
  }, [gameState, canvasSize, selectedCharacter, hasGhostMode, hasStartShield, hasBookMagnet]);

  // Handle power selection with tap to continue
  const handlePowerSelect = useCallback((power: any) => {
    // Hide power selection immediately
    setShowPowerSelection(false);
    setPowerChoices(getRandomPowers(hasLuckyStart())); // Generate new choices for next time

    // Set waiting state instead of countdown
    setWaitingForContinue(true);
    setPendingPower(power);
  }, [getRandomPowers, setShowPowerSelection, hasLuckyStart]);

  // Game loop with optimized performance
  useEffect(() => {
    // Remove debug logging for better performance
    if (gameState.gameStarted && !gameState.gameOver && !showPowerSelection && !waitingForContinue) {
      const startGameLoop = (timestamp: number) => {
        gameLoop(timestamp);
      };
      animationRef.current = requestAnimationFrame(startGameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState.gameStarted, gameState.gameOver, showPowerSelection, waitingForContinue]);

  // Handle input using Pointer Events to avoid duplicate touch/click on mobile
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      // Schedule all logic on next frame to avoid main-thread work during input
      if (waitingForContinue || e.target === canvasRef.current) {
        requestAnimationFrame(jump);
      }
    };
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('pointerdown', handlePointerDown, {
        passive: true
      });
    }

    // Also add global event listener for waiting for continue
    if (waitingForContinue) {
      document.addEventListener('pointerdown', handlePointerDown, {
        passive: true
      });
    }
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
      }
      if (waitingForContinue) {
        document.removeEventListener('pointerdown', handlePointerDown);
      }
    };
  }, [jump, waitingForContinue]);
  return <div className="fixed inset-0 bg-gradient-to-b from-sky-start to-sky-end overflow-hidden">
      
      {/* Retro Nerdy Background Elements - Desktop Only */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none">
        {/* Floating Math Equations */}
        <div className="absolute top-20 left-10 text-4xl opacity-20 animate-float">π = 3.14159...</div>
        <div className="absolute top-40 right-20 text-3xl opacity-15 animate-pulse">E = mc²</div>
        <div className="absolute bottom-32 left-16 text-2xl opacity-20">∫ f(x)dx</div>
        <div className="absolute top-60 left-32 text-3xl opacity-15 animate-bounce">√(x² + y²)</div>
        <div className="absolute bottom-20 right-32 text-2xl opacity-20">Σ(n=1 to ∞)</div>
        <div className="absolute top-80 left-80 text-2xl opacity-15 animate-float">(a + b)² = a² + 2ab + b²</div>
        <div className="absolute bottom-80 right-80 text-3xl opacity-20">∂f/∂x</div>
        
        {/* Retro Computer Elements */}
        <div className="absolute top-32 right-10 text-6xl opacity-10 animate-pulse">💾</div>
        <div className="absolute bottom-40 left-8 text-5xl opacity-15">🖥️</div>
        <div className="absolute top-80 right-40 text-4xl opacity-10 animate-bounce">⌨️</div>
        <div className="absolute bottom-60 right-8 text-3xl opacity-20">🖱️</div>
        <div className="absolute top-16 left-80 text-4xl opacity-15 animate-pulse">💿</div>
        <div className="absolute bottom-16 right-16 text-5xl opacity-10">📼</div>
        <div className="absolute top-96 right-20 text-3xl opacity-20 animate-float">📟</div>
        
        {/* Programming & Code Elements */}
        <div className="absolute top-48 left-20 text-2xl opacity-15 font-mono transform rotate-6">
          {"if (nerd) { study(); }"}
        </div>
        <div className="absolute bottom-48 right-40 text-xl opacity-10 font-mono transform -rotate-12">
          {"function solve() { return 42; }"}
        </div>
        <div className="absolute top-72 right-60 text-lg opacity-20 font-mono">
          {"<html><brain></brain></html>"}
        </div>
        <div className="absolute bottom-72 left-60 text-xl opacity-15 font-mono transform rotate-3">
          {"while(learning) { grow++; }"}
        </div>
        
        {/* Nerd Culture Icons */}
        <div className="absolute top-16 right-60 text-5xl opacity-15 animate-pulse">🚀</div>
        <div className="absolute bottom-16 left-40 text-4xl opacity-10">🧬</div>
        <div className="absolute top-96 left-8 text-3xl opacity-20 animate-bounce">⚗️</div>
        <div className="absolute top-120 right-80 text-4xl opacity-15">🔬</div>
        <div className="absolute bottom-96 left-80 text-3xl opacity-10 animate-float">🧪</div>
        <div className="absolute top-40 left-60 text-4xl opacity-20">⚡</div>
        <div className="absolute bottom-40 right-60 text-3xl opacity-15 animate-pulse">🔭</div>
        
        {/* Retro Gaming Elements */}
        <div className="absolute top-64 left-12 text-3xl opacity-10 animate-bounce">🎮</div>
        <div className="absolute bottom-64 right-12 text-4xl opacity-15">👾</div>
        <div className="absolute top-88 right-12 text-2xl opacity-20 animate-pulse">8-BIT</div>
        
        {/* Circuit & Tech Patterns */}
        <div className="absolute top-24 right-32 text-xl opacity-10 font-mono transform rotate-45">
          ┌─┐ ┌─┐ ┌─┐
        </div>
        <div className="absolute bottom-24 left-32 text-xl opacity-15 font-mono transform -rotate-45">
          ═══╬═══╬═══
        </div>
        
        {/* Binary Code Background */}
        <div className="absolute top-24 left-60 text-sm opacity-10 font-mono transform rotate-12">
          01001000 01100101 01101100 01101100 01101111
        </div>
        <div className="absolute bottom-24 right-60 text-sm opacity-10 font-mono transform -rotate-12">
          01010111 01101111 01110010 01101100 01100100
        </div>
        <div className="absolute top-56 left-4 text-xs opacity-15 font-mono transform rotate-90">
          11001010 11010101 10101010
        </div>
        <div className="absolute bottom-56 right-4 text-xs opacity-10 font-mono transform -rotate-90">
          01010101 10101010 01101001
        </div>
        
        {/* Scientific Symbols */}
        <div className="absolute top-104 left-20 text-3xl opacity-15">∆</div>
        <div className="absolute bottom-104 right-20 text-2xl opacity-20">Ω</div>
        <div className="absolute top-112 right-40 text-4xl opacity-10">∑</div>
        <div className="absolute bottom-112 left-40 text-3xl opacity-15">∏</div>
        
        {/* Chemistry Elements */}
        <div className="absolute top-52 right-24 text-2xl opacity-20">H₂O</div>
        <div className="absolute bottom-52 left-24 text-xl opacity-15">CO₂</div>
        <div className="absolute top-76 left-44 text-2xl opacity-10">NaCl</div>
      </div>
      
      {/* Game Canvas Container */}
      <div className="absolute inset-0 flex items-center justify-center touch-none" style={{
      width: '100vw',
      height: '100dvh'
    }}>
        <div className="relative border-2 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-game bg-gradient-sky overflow-hidden touch-none" style={{
        width: canvasSize.width,
        height: canvasSize.height,
        maxWidth: '100vw',
        maxHeight: '100svh'
      }}>
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block touch-none select-none w-full h-full" style={{
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          imageRendering: 'pixelated',
          width: canvasSize.width + 'px',
          height: canvasSize.height + 'px'
        }} />

        {/* Score Display */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
          <Card className="px-2 py-1 sm:px-3 sm:py-2 bg-gradient-score shadow-soft">
            <div className="text-sm sm:text-base md:text-lg font-bold text-warning-foreground">
              Score: {gameState.score}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Best: {stats.best_score} 👑
            </div>
          </Card>
        </div>

        {/* Active Powers Display */}
        {(() => {
          const modifiers = getGameModifiers();

          // Create display items for UI
          const displayPowers: Array<{
            id: string;
            emoji: string;
            name: string;
            endTime?: number;
            startTime: number;
            stackCount?: number;
          }> = [];
          const topLeftPowers: Array<{
            id: string;
            emoji: string;
            name: string;
            startTime: number;
          }> = [];

          // Add regular powers (excluding ghost mode to avoid duplicates)
          modifiers.activePowers.forEach(power => {
            displayPowers.push({
              id: power.id,
              emoji: power.emoji,
              name: power.name,
              endTime: power.endTime,
              startTime: power.startTime,
              stackCount: power.stackCount
            });
          });

          // Add ghost mode with timer (only once)
          shopActivePowers.forEach(shopPower => {
            if (shopPower.power_id === 'ghost_mode') {
              const timeRemaining = shopPower.duration ? Math.max(0, shopPower.duration - (Date.now() - gameStartTime)) : 0;
              if (timeRemaining > 0) {
                displayPowers.push({
                  id: 'ghost-mode-timer',
                  emoji: '👻',
                  name: `Ghost Mode (${Math.ceil(timeRemaining / 1000)}s)`,
                  endTime: gameStartTime + (shopPower.duration || 0),
                  startTime: gameStartTime
                });
              }
            }
          });

          // Add shield mode indicator to top-right
          if (hasStartShield()) {
            displayPowers.push({
              id: 'shield-mode',
              emoji: '🛡️',
              name: 'Shield Mode',
              startTime: gameStartTime
            });
          }

          // Add lucky start and double points to top-right
          if (hasLuckyStart()) {
            displayPowers.push({
              id: 'lucky-start',
              emoji: '🍀',
              name: 'Lucky Start',
              startTime: gameStartTime
            });
          }
          if (hasDoublePoints()) {
            displayPowers.push({
              id: 'double-points',
              emoji: '💰',
              name: '2x Points',
              startTime: gameStartTime
            });
          }

          // Add book magnet to top-right
          if (hasBookMagnet()) {
            displayPowers.push({
              id: 'book-magnet',
              emoji: '🧲',
              name: 'Auto Collector',
              startTime: gameStartTime
            });
          }
          return <>
              {/* All powers moved to top-right */}
              {displayPowers.length > 0 && <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 space-y-1">
                  {displayPowers.map((power, index) => <Card key={`${power.id}-${power.startTime}`} className="px-2 py-1 bg-accent/90 shadow-soft">
                      <div className="flex items-center space-x-1 text-xs sm:text-sm">
                        <span>{power.emoji}</span>
                        <span className="font-medium">{power.name}</span>
                        {power.stackCount && power.stackCount > 1 && <span className="bg-warning text-warning-foreground px-1 rounded text-xs font-bold">
                            x{power.stackCount}
                          </span>}
                      </div>
                    </Card>)}
                </div>}
            </>;
        })()}

        {/* Game Over Screen */}
        {gameState.gameOver && <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-lg">
            <Card className="p-3 sm:p-4 md:p-8 text-center space-y-2 sm:space-y-3 md:space-y-4 animate-bounce-in shadow-game max-w-sm mx-2 sm:mx-4 bg-background/80 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl">💥</div>
              {gameState.isNewRecord ? <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-warning">New Record! 👑</h2> : <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-danger">Game Over!</h2>}
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-extrabold">
                {gameState.isNewRecord ? '"I\'m the smartest nerd ever!"' : '"I should\'ve studied more!"'}
              </p>
              <div className="text-base sm:text-lg md:text-xl font-semibold">
                Final Score: {gameState.score}
              </div>
              {gameState.record > 0 && !gameState.isNewRecord && <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Record: {gameState.record} 👑
                </div>}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button onClick={resetGame} variant="default" size="lg" className="bg-warning text-warning-foreground shadow-glow h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 p-0 mx-auto sm:mx-0">
                  <RotateCcw size={24} />
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" size="lg" className="flex-1 text-sm sm:text-base font-extrabold">Main Menu </Button>
              </div>
            </Card>
          </div>}

        {/* Start Screen */}
        {!gameState.gameStarted && !gameState.gameOver && <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 rounded-lg">
            <Card className="p-3 sm:p-4 md:p-8 text-center space-y-2 sm:space-y-3 md:space-y-4 animate-bounce-in shadow-game max-w-md mx-2 sm:mx-4">
              <div className="text-4xl sm:text-5xl md:text-6xl">🤓</div>
              <h1 className="text-2xl sm:text-3xl text-green-400 font-extrabold md:text-6xl">Ready Nerd?</h1>
              
              <div className="space-y-1 sm:space-y-2 text-xs md:text-sm text-muted-foreground">
                <p>Tap anywhere to get through the gap!</p>
                
                <p>📚 Avoid The Lockers, While Collecting The Books! 📚</p>
              </div>
              <Button onClick={jump} variant="default" size="lg" className="bg-gradient-button-green text-white shadow-glow animate-pulse-glow w-full text-sm sm:text-base">
                Start Learning! 📚
              </Button>
            </Card>
          </div>}

        {/* Power Selection Modal */}
        <PowerSelection isOpen={showPowerSelection} powers={powerChoices} onSelectPower={handlePowerSelect} />

        {/* Tap to Continue Modal */}
        {waitingForContinue && pendingPower && <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 z-50 rounded-lg">
            <Card className="p-6 sm:p-8 text-center space-y-4 animate-scale-in shadow-game max-w-sm mx-4 bg-background/60 backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl">{pendingPower.emoji}</div>
              <h2 className="text-xl sm:text-2xl font-bold text-black">
                {pendingPower.name} Ready!
              </h2>
              <p className="text-sm sm:text-base font-bold text-black">
                {pendingPower.description}
              </p>
              <div className="text-lg sm:text-xl font-bold text-black animate-pulse">
                Tap to Continue
              </div>
            </Card>
          </div>}
        </div>
      </div>
    </div>;
};
export default Game;