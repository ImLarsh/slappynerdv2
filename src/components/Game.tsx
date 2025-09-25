import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
import bgImage from '@/assets/school-hallway-bg.png';
import lockerYellow from '@/assets/locker-yellow.png';

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
  bird: GameObject & { velocity: number };
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

// iOS-specific performance optimizations
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const TARGET_FPS = 60; // Lock to 60fps for consistency
const FRAME_TIME = 1000 / TARGET_FPS;

// iOS Safari specific optimizations
const IOS_OPTIMIZATIONS = {
  REDUCE_PARTICLES: true,
  BATCH_DRAW_CALLS: true,
  HARDWARE_ACCELERATION: true,
  MEMORY_POOLING: true,
  AGGRESSIVE_GC_PREVENTION: true
};

// Performance monitoring
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;
  private frameTimeHistory: number[] = [];
  private maxHistory = 60; // Track last 60 frames
  
  update(): { fps: number; frameTime: number; isStutter: boolean } {
    const now = performance.now();
    const frameTime = now - this.lastTime;
    this.frameTimeHistory.push(frameTime);
    
    if (this.frameTimeHistory.length > this.maxHistory) {
      this.frameTimeHistory.shift();
    }
    
    this.frameCount++;
    if (this.frameCount >= 60) {
      this.fps = Math.round(1000 / (this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length));
      this.frameCount = 0;
    }
    
    // Detect frame stutter (frame time > 20ms = under 50fps)
    const isStutter = frameTime > 20;
    this.lastTime = now;
    
    return { fps: this.fps, frameTime, isStutter };
  }
  
  getAverageFrameTime(): number {
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  }
}

// Object pooling for iOS memory optimization
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  get(): T {
    const obj = this.pool.pop();
    return obj || this.createFn();
  }
  
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}
const GRAVITY = 0.6;
const JUMP_FORCE = -9.4;
const PIPE_WIDTH = 80;
const BASE_PIPE_GAP = 280;
const MIN_PIPE_GAP = 180;
const LOCKER_WIDTH = 220;
const PIPE_SPEED = 2.5;
const PIPE_GAP = 220;
const BIRD_SIZE = 50;

// iOS-optimized constants
const IOS_RENDER_SCALE = isIOS() ? 0.8 : 1; // Reduce render complexity on iOS

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number>();
  const { submitScore } = useLeaderboard();
  const { stats, updateGameStats } = useUserStats();
  const { selectedCharacter } = useCharactersContext();
  const { checkAchievements } = useAchievements();
  const { user } = useAuth();
  const { addBooks } = useCurrency();
  const { toast } = useToast();
  const { playSound } = useAudio();
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
  
  // iOS Performance monitoring
  const performanceMonitorRef = useRef(new PerformanceMonitor());
  const [performanceStats, setPerformanceStats] = useState({ fps: 60, frameTime: 16.67, isStutter: false });
  
  // Object pools for iOS memory optimization
  const bookPoolRef = useRef(new ObjectPool<Book>(
    () => ({ id: '', x: 0, y: 0, collected: false }),
    (book) => { book.collected = false; book.beingPulled = false; book.pullStartTime = undefined; }
  ));
  
  const pipePoolRef = useRef(new ObjectPool<Pipe>(
    () => ({ x: 0, y: 0, width: LOCKER_WIDTH, height: 0, passed: false, lockerType: 0 }),
    (pipe) => { pipe.passed = false; }
  ));
  
  // Track whether the game is currently running to avoid resize-induced jank
  const isPlayingRef = useRef(false);
  
  // Cached image references for iOS optimization
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const lockerImagesRef = useRef<HTMLImageElement[]>([]);
  const nextBookIdRef = useRef(0);
  
  // iOS-specific rendering optimization flags
  const shouldRenderEffectsRef = useRef(!isIOS());
  const renderFrameCountRef = useRef(0);
  
  const [gameState, setGameState] = useState<GameState>({
    bird: { x: 100, y: 200, width: BIRD_SIZE, height: BIRD_SIZE, velocity: 0 },
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
    backgroundOffset: 0,
  });
  
  // iOS game state ref and UI sync cadence
  const gameRef = useRef<GameState>(gameState);
  const lastUISyncRef = useRef(performance.now());
  const uiSyncIntervalMsRef = useRef(150);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [powerChoices, setPowerChoices] = useState(() => getRandomPowers(hasLuckyStart()));
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [pendingPower, setPendingPower] = useState<any>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(0);

  // Load background image, locker images and get user record on component mount
  useEffect(() => {
    // iOS-specific DOM optimizations
    if (isIOS()) {
      const bodyStyle = document.body.style as any;
      bodyStyle.WebkitTapHighlightColor = 'transparent';
      bodyStyle.WebkitTouchCallout = 'none';
      bodyStyle.webkitUserSelect = 'none';
      bodyStyle.transform = 'translateZ(0)'; // Hardware acceleration
    }
    
    // Prevent body scrolling on mobile when game is active
    document.body.classList.add('game-active');

    // Load and optimize images for iOS
    const img = new Image();
    img.onload = () => {
      // iOS optimization: create an offscreen canvas for better performance
      if (isIOS() && img.complete) {
        const offscreenCanvas = document.createElement('canvas');
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
          offscreenCanvas.width = img.width * IOS_RENDER_SCALE;
          offscreenCanvas.height = img.height * IOS_RENDER_SCALE;
          ctx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
          // Replace original image with optimized version
          const optimizedImg = new Image();
          optimizedImg.src = offscreenCanvas.toDataURL();
          backgroundImageRef.current = optimizedImg;
        }
      } else {
        backgroundImageRef.current = img;
      }
    };
    img.onerror = (e) => console.error('Background failed to load:', e);
    img.src = bgImage;

    // Load and optimize locker image for iOS
    const lockerImg = new Image();
    lockerImg.onload = () => {
      if (isIOS() && lockerImg.complete) {
        const offscreenCanvas = document.createElement('canvas');
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
          offscreenCanvas.width = lockerImg.width * IOS_RENDER_SCALE;
          offscreenCanvas.height = lockerImg.height * IOS_RENDER_SCALE;
          ctx.drawImage(lockerImg, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
          const optimizedImg = new Image();
          optimizedImg.src = offscreenCanvas.toDataURL();
          lockerImagesRef.current[0] = optimizedImg;
        }
      } else {
        lockerImagesRef.current[0] = lockerImg;
      }
    };
    lockerImg.onerror = (e) => console.error('Yellow locker failed to load:', e);
    lockerImg.src = lockerYellow;

    // Cleanup function
    return () => {
      document.body.classList.remove('game-active');
      if (isIOS()) {
        const bodyStyle = document.body.style as any;
        bodyStyle.transform = '';
      }
    };
  }, []);

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
        // Desktop
        width = 800;
        height = 600;
      }
      
      // Ensure minimum sizes for playability
      width = Math.max(300, width);
      height = Math.max(400, height);
      
      setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    };

    // Initial size
    updateCanvasSize();
    
    // Add event listeners with passive option for better performance
    const resizeOptions = { passive: true };
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
        return { ...prev, record: playerBestScore };
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
      bird: { x: 100, y: canvasSize.height / 3, width: BIRD_SIZE, height: BIRD_SIZE, velocity: 0 },
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
      backgroundOffset: 0,
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
      setGameState(prev => ({
        ...prev,
        bird: { ...prev.bird, velocity: JUMP_FORCE }
      }));
      // Play tap/flap sound (defer on iOS to avoid input-frame stutter)
      if (isIOS()) {
        requestAnimationFrame(() => playSound('tapFlap'));
      } else {
        playSound('tapFlap');
      }
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
    const emojiMargin = BIRD_SIZE * 0.25; // Increased from 0.15 to 0.25
    const lockerHorizontalMargin = Math.max(55, LOCKER_WIDTH * 0.38); // Slightly reduced for bigger hitboxes
    const lockerVerticalMargin = 12; // Slightly reduced from 15 to 12
    
    const isColliding = (
      bird.x + emojiMargin < pipe.x + pipe.width - lockerHorizontalMargin &&
      bird.x + bird.width - emojiMargin > pipe.x + lockerHorizontalMargin &&
      bird.y + emojiMargin < pipe.y + pipe.height - lockerVerticalMargin &&
      bird.y + bird.height - emojiMargin > pipe.y + lockerVerticalMargin
    );
    
    // If there's a collision and player has shield mode available, demolish the obstacle
    if (isColliding && hasStartShield()) {
      removeShieldMode(); // Remove shield mode permanently after use
      toast({
        title: "Shield Mode Activated! 🛡️",
        description: "You demolished the obstacle!",
      });
      
      // Mark this pipe for removal by setting a special flag
      (pipe as any).shouldBeRemoved = true;
      
      return false; // No collision damage - obstacle is demolished
    }
    
    return isColliding;
  }, [hasGhostMode, updateActivePowers, gameStartTime, hasStartShield, removeShieldMode, toast]);

  const spawnBook = useCallback((pipes: Pipe[] = []) => {
    // Find safe Y positions by checking where pipes are NOT
    const safeAreas: {start: number, end: number}[] = [];
    
    // Start with the full canvas height as one big safe area
    let occupiedRanges: {start: number, end: number}[] = [];
    
    // Check nearby pipes that could interfere with book spawning
    const nearbyPipes = pipes.filter(pipe => 
      pipe.x > canvasSize.width - 300 && pipe.x < canvasSize.width + 400
    );
    
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
    const mergedRanges: {start: number, end: number}[] = [];
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
      safeAreas.push({ start: currentY, end: maxY });
    }
    
    // If no safe areas found (very unlikely), try to spawn in the largest gap
    if (safeAreas.length === 0) {
      // Find the largest gap between pipes and use it anyway
      let largestGap = { start: 80, end: canvasSize.height - 80, size: canvasSize.height - 160 };
      
      for (let i = 0; i < mergedRanges.length - 1; i++) {
        const gapStart = mergedRanges[i].end;
        const gapEnd = mergedRanges[i + 1].start;
        const gapSize = gapEnd - gapStart;
        
        if (gapSize > largestGap.size && gapSize > 60) {
          largestGap = { start: gapStart + 20, end: gapEnd - 20, size: gapSize - 40 };
        }
      }
      
      if (largestGap.size > 40) {
        safeAreas.push({ start: largestGap.start, end: largestGap.end });
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
      x: canvasSize.width + Math.random() * 200, // Spawn ahead of the player
      y: safeY,
      collected: false
    };
    
    setGameState(prev => ({
      ...prev,
      books: [...prev.books, newBook]
    }));
  }, [canvasSize]);

  const checkBookCollisions = useCallback((bird: GameObject, books: Book[]): { updatedBooks: Book[], booksCollected: number } => {
    let booksCollected = 0;
    
    const updatedBooks = books.map(book => {
      if (book.collected) return book;
      
      // Use stable book id
      const bookId = book.id;
      
      // Track when book is first seen (for auto-collection)
      onBookSeen(bookId);
      
      const distance = Math.sqrt(
        Math.pow(book.x - (bird.x + bird.width / 2), 2) + 
        Math.pow(book.y - (bird.y + bird.height / 2), 2)
      );
      
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
        return { ...book, collected: true };
      }
      
      if (shouldStartPull) {
        return { ...book, beingPulled: true, pullStartTime: Date.now() };
      }
      
      return book;
    });
    
    return { updatedBooks, booksCollected };
  }, [onBookSeen, shouldAutoCollectBook, hasBookMagnet]);

  // iOS-only renderer to avoid React-driven draws
  const drawFrameIOS = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear background
    ctx.fillStyle = 'hsl(200, 100%, 85%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background image
    const img = backgroundImageRef.current;
    if (img && img.complete) {
      const bgWidth = img.width;
      const bgHeight = img.height;
      const scaleX = canvas.width / bgWidth;
      const scaleY = canvas.height / bgHeight;
      const scale = Math.max(scaleX, scaleY);
      const scaledWidth = bgWidth * scale;
      const scaledHeight = bgHeight * scale;
      const offsetY = (canvas.height - scaledHeight) / 2;
      const scrollOffset = state.backgroundOffset % scaledWidth;
      // Draw minimal copies
      for (let i = -1; i <= 2; i++) {
        ctx.drawImage(img, i * scaledWidth - scrollOffset, offsetY, scaledWidth, scaledHeight);
      }
    }

    // Draw pipes (no shadows)
    const EDGE_OVERDRAW = Math.max(24, Math.round(canvasSize.height * 0.03));
    const lockerImage = lockerImagesRef.current[0];
    for (let i = 0; i < state.pipes.length; i++) {
      const pipe = state.pipes[i];
      if (lockerImage && lockerImage.complete) {
        const targetWidth = LOCKER_WIDTH;
        const targetHeight = pipe.height;
        const drawX = pipe.x;
        const drawY = pipe.y;
        const isTopLocker = pipe.y === 0;
        if (isTopLocker) {
          ctx.save();
          ctx.scale(1, -1);
          ctx.drawImage(lockerImage, drawX, -drawY - targetHeight, targetWidth, targetHeight + EDGE_OVERDRAW);
          ctx.restore();
        } else {
          ctx.drawImage(lockerImage, drawX, drawY, targetWidth, targetHeight + EDGE_OVERDRAW);
        }
      } else {
        ctx.fillStyle = '#FFD700';
        const isTopLocker = pipe.y === 0;
        const rectY = isTopLocker ? pipe.y - EDGE_OVERDRAW : pipe.y;
        const rectH = pipe.height + EDGE_OVERDRAW;
        ctx.fillRect(pipe.x, rectY, pipe.width, rectH);
      }
    }

    // Draw books (simple filled circles)
    for (let i = 0; i < state.books.length; i++) {
      const book = state.books[i];
      if (book.collected) continue;
      const bookSize = 32;
      ctx.beginPath();
      ctx.arc(book.x + bookSize/2, book.y - bookSize/2, bookSize/2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
    }

    // Draw player (emoji with minimal effects)
    ctx.font = `${BIRD_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤓', state.bird.x + state.bird.width/2, state.bird.y + state.bird.height/2);

    // Optional simple shield ring
    if (hasStartShield()) {
      ctx.beginPath();
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.arc(state.bird.x + state.bird.width/2, state.bird.y + state.bird.height/2, BIRD_SIZE * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [canvasSize.height, hasStartShield]);


  const gameLoop = useCallback((currentTime: number) => {
    if (!canvasRef.current || !gameState.gameStarted || gameState.gameOver || showPowerSelection || waitingForContinue) return;

    // iOS-specific performance monitoring
    const perfStats = performanceMonitorRef.current.update();
    
    // Update performance stats every 30 frames to avoid UI thrashing
    if (renderFrameCountRef.current % 30 === 0) {
      setPerformanceStats(perfStats);
    }
    renderFrameCountRef.current++;

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }


    setGameState(prev => {
      const newState = { ...prev };
      const deltaTime = currentTime - newState.lastFrameTime;
      // iOS: Consistent frame timing for 60fps without forcing React re-render
      if (isIOS() && deltaTime < FRAME_TIME * 0.9) {
        return prev; // Skip React state update on iOS to maintain cadence
      }

      // Clamp delta to avoid big jumps on tab switching/backgrounding
      const clampedDelta = Math.min(deltaTime, 50);
      
      // Get current power modifiers
      const modifiers = getGameModifiers();
      
      // Calculate frame multiplier for consistent movement across different frame rates
      const frameMultiplier = clampedDelta / FRAME_TIME;
      newState.lastFrameTime = currentTime;

      // Clear expired temporary invincibility
      if (newState.temporaryInvincibility && currentTime >= newState.temporaryInvincibility) {
        newState.temporaryInvincibility = undefined;
      }

      

      // Update bird physics with frame rate compensation
      newState.bird.velocity += GRAVITY * frameMultiplier;
      newState.bird.y += newState.bird.velocity * frameMultiplier;

      // Update background scrolling
      newState.backgroundOffset += (PIPE_SPEED * modifiers.speedMultiplier) * frameMultiplier;

      // Check ground/ceiling collision - game over when emoji completely falls off screen
      if (newState.bird.y > canvasSize.height || newState.bird.y + newState.bird.height < 0) {
        newState.gameOver = true;
        newState.gameEnded = true;
        
        // Play defeat sound
        if (isIOS()) {
          requestAnimationFrame(() => playSound('defeat'));
        } else {
          playSound('defeat');
        }
        
        // Update stats in database and get new totals
        if (user) {
          updateGameStats(newState.score).then((updatedStats) => {
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

        // iOS: draw and throttle UI updates instead of React re-render per frame
        if (isIOS()) {
          const ctxIos = ctxRef.current;
          if (ctxIos) drawFrameIOS(ctxIos, newState);
          gameRef.current = newState;
          const now = currentTime;
          const needUISync = now - lastUISyncRef.current > uiSyncIntervalMsRef.current ||
            newState.gameOver !== prev.gameOver || newState.score !== prev.score;
          if (!needUISync) return prev;
          lastUISyncRef.current = now;
        }

        return newState;
      }

      // Generate pipes (iOS-optimized spawn rates)
      const iosSpawnMultiplier = isIOS() ? 1.3 : 1; // Slightly reduce spawn rate on iOS
      const basePipeFrequency = (canvasSize.width < 500 ? 2200 : 1800) * iosSpawnMultiplier;
      const hasLockerSpam = modifiers.activePowers.some(p => p.id === 'locker_spam');
      const pipeFrequency = hasLockerSpam ? basePipeFrequency * 0.5 : basePipeFrequency;
      
      // Prevent pipe spawning during power selection or right after power activation to avoid stacking
      const timeSinceLastPipe = currentTime - newState.lastPipeTime;
      const canSpawnPipe = timeSinceLastPipe > pipeFrequency && 
                          (!newState.temporaryInvincibility || currentTime > newState.temporaryInvincibility + 500);
      
      if (canSpawnPipe) {
        // Calculate gap size - only affected by gap-specific powers, not speed powers
        const gapPowers = modifiers.activePowers.filter(p => p.effect.gapMultiplier);
        const gapMultiplier = gapPowers.reduce((mult, power) => mult * power.effect.gapMultiplier!, 1);
        
        const gapStart = Math.random() * (canvasSize.height - (PIPE_GAP * gapMultiplier) - 100) + 50;
        const lockerType = 0; // Always use yellow locker
        // Position lockers from the right edge - ensure consistent spacing
        const lockerX = canvasSize.width + LOCKER_WIDTH + 10; // Add small buffer to prevent immediate collision
        
        // Ensure minimum gap size to prevent impossible passages
        const finalGapSize = Math.max(MIN_PIPE_GAP, PIPE_GAP * gapMultiplier);
        const finalGapStart = Math.max(60, Math.min(gapStart, canvasSize.height - finalGapSize - 60));
        
        // Only add pipes if they don't overlap with existing ones
        const wouldOverlap = newState.pipes.some(existingPipe => 
          Math.abs(existingPipe.x - lockerX) < LOCKER_WIDTH + 50
        );
        
        if (!wouldOverlap) {
          // Use object pooling for iOS memory optimization
          const topPipe = IOS_OPTIMIZATIONS.MEMORY_POOLING ? pipePoolRef.current.get() : {
            x: lockerX,
            y: 0,
            width: LOCKER_WIDTH,
            height: finalGapStart,
            passed: false,
            lockerType,
          };
          
          const bottomPipe = IOS_OPTIMIZATIONS.MEMORY_POOLING ? pipePoolRef.current.get() : {
            x: lockerX,
            y: finalGapStart + finalGapSize,
            width: LOCKER_WIDTH,
            height: canvasSize.height - (finalGapStart + finalGapSize),
            passed: false,
            lockerType,
          };
          
          // Set properties for pooled objects
          if (IOS_OPTIMIZATIONS.MEMORY_POOLING) {
            Object.assign(topPipe, {
              x: lockerX, y: 0, width: LOCKER_WIDTH, height: finalGapStart, passed: false, lockerType
            });
            Object.assign(bottomPipe, {
              x: lockerX, y: finalGapStart + finalGapSize, width: LOCKER_WIDTH, 
              height: canvasSize.height - (finalGapStart + finalGapSize), passed: false, lockerType
            });
          }
          
          newState.pipes.push(topPipe, bottomPipe);
          newState.lastPipeTime = currentTime;
          
          // 10% chance to spawn a book with the new pipe (reduced on iOS for performance)
          const bookSpawnChance = isIOS() ? 0.08 : 0.1;
          if (Math.random() < bookSpawnChance && !hasLockerSpam) {
            const gapMiddle = finalGapStart + finalGapSize / 2;
            const safeY = gapMiddle + (Math.random() - 0.5) * (finalGapSize * 0.6);
            
            // Use object pooling for books on iOS
            const newBook = IOS_OPTIMIZATIONS.MEMORY_POOLING ? bookPoolRef.current.get() : {
              id: `book_${nextBookIdRef.current++}`,
              x: lockerX + LOCKER_WIDTH / 2,
              y: Math.max(80, Math.min(safeY, canvasSize.height - 80)),
              collected: false
            };
            
            if (IOS_OPTIMIZATIONS.MEMORY_POOLING) {
              Object.assign(newBook, {
                id: `book_${nextBookIdRef.current++}`,
                x: lockerX + LOCKER_WIDTH / 2,
                y: Math.max(80, Math.min(safeY, canvasSize.height - 80)),
                collected: false
              });
            }
            
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
            
            if (distance > 5) { // Only pull if not too close
              // Normalize direction and apply pull speed (faster when farther)
              const pullSpeed = Math.min(12, 6 + distance * 0.1) * frameMultiplier;
              const normalizedDx = dx / distance;
              const normalizedDy = dy / distance;
              
              book.x += normalizedDx * pullSpeed;
              book.y += normalizedDy * pullSpeed;
            }
          } else {
            // Normal book movement (scroll with world)
            book.x -= (PIPE_SPEED * modifiers.speedMultiplier) * frameMultiplier;
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
          if (isIOS()) {
            requestAnimationFrame(() => playSound('collectBook'));
          } else {
            playSound('collectBook');
          }
        }, 0);
      }

      // Update pipes with frame rate compensation and iOS memory optimization
      newState.pipes = newState.pipes.filter(pipe => {
        // Remove pipes marked for demolition by Ghost Mode
        if ((pipe as any).shouldBeRemoved) {
          // Return to object pool if using iOS optimizations
          if (IOS_OPTIMIZATIONS.MEMORY_POOLING) {
            pipePoolRef.current.release(pipe);
          }
          return false;
        }
        
        pipe.x -= (PIPE_SPEED * modifiers.speedMultiplier) * frameMultiplier;
        
        // Check scoring
        if (!pipe.passed && pipe.x + pipe.width < newState.bird.x) {
          pipe.passed = true;
          if (pipe.y === 0) { // Only count top pipes
            newState.score += 1;
            
            // Play pass locker sound effect
            if (isIOS()) {
              requestAnimationFrame(() => playSound('passLocker'));
            } else {
              playSound('passLocker');
            }
            
            // Check for power selection trigger
            checkPowerSelection(newState.score);
            
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
          if (isIOS()) {
            requestAnimationFrame(() => playSound('defeat'));
          } else {
            playSound('defeat');
          }
          
          // Update stats in database and get new totals
          if (user) {
            updateGameStats(newState.score).then((updatedStats) => {
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
        const shouldRemove = pipe.x <= -pipe.width || (pipe as any).shouldBeRemoved;
        if (shouldRemove && IOS_OPTIMIZATIONS.MEMORY_POOLING) {
          pipePoolRef.current.release(pipe);
        }
        return !shouldRemove;
      });
      // iOS: draw and throttle UI updates instead of React re-render per frame
      if (isIOS()) {
        const ctxIos = ctxRef.current;
        if (ctxIos) drawFrameIOS(ctxIos, newState);
        gameRef.current = newState;
        const now = currentTime;
        const needUISync = now - lastUISyncRef.current > uiSyncIntervalMsRef.current ||
          newState.gameOver !== prev.gameOver || newState.score !== prev.score;
        if (!needUISync) return prev;
        lastUISyncRef.current = now;
      }

      return newState;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getGameModifiers, checkPowerSelection, checkBookCollisions, addBooks, playSound, toast]);

  // Initialize and cache 2D context (iOS optimized)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure size before grabbing context
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: isIOS(),
        willReadFrequently: false
      }) as CanvasRenderingContext2D | null;
      if (!ctx) return;
      ctxRef.current = ctx;
    }
    ctx.imageSmoothingEnabled = !isIOS();
    if (isIOS() && 'imageSmoothingQuality' in ctx) {
      (ctx as any).imageSmoothingQuality = 'low';
    }
  }, [canvasSize.width, canvasSize.height]);

  // Canvas drawing with error handling
  useEffect(() => {
    // On iOS, drawing is handled inside the RAF game loop to avoid React re-render cost
    if (isIOS()) return;
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

    // Use cached 2D context
    let ctx = ctxRef.current as CanvasRenderingContext2D | null;
    if (!ctx) {
      ctx = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: isIOS(),
        willReadFrequently: false
      }) as CanvasRenderingContext2D | null;
      if (!ctx) {
        console.error('Cannot get canvas context');
        return;
      }
      ctxRef.current = ctx;
      ctx.imageSmoothingEnabled = !isIOS();
      if (isIOS() && 'imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'low';
      }
    }


    // Ensure canvas is visible - draw initial background
    ctx.fillStyle = 'hsl(200, 100%, 85%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scrolling background (iOS-optimized)
    if (backgroundImageRef.current && backgroundImageRef.current.complete) {
      const img = backgroundImageRef.current;
      const bgWidth = img.width;
      const bgHeight = img.height;
      
      // Scale background to cover entire canvas (stretch to fill)
      const scaleX = canvas.width / bgWidth;
      const scaleY = canvas.height / bgHeight;
      const scale = Math.max(scaleX, scaleY);
      
      const scaledWidth = bgWidth * scale;
      const scaledHeight = bgHeight * scale;
      
      // Center the image if it's larger than canvas
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      // Calculate offset for seamless looping
      const scrollOffset = gameState.backgroundOffset % scaledWidth;
      
      // iOS optimization: reduce background complexity
      const maxCopies = isIOS() ? 2 : Math.ceil(canvas.width / scaledWidth) + 1;
      
      // Draw background copies
      for (let i = -1; i <= maxCopies; i++) {
        ctx.drawImage(
          img,
          i * scaledWidth - scrollOffset,
          offsetY,
          scaledWidth,
          scaledHeight
        );
      }
    } else {
      // Fallback: Clear canvas with sky gradient if image not loaded
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'hsl(200, 100%, 85%)');
      gradient.addColorStop(1, 'hsl(220, 100%, 92%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw lockers instead of pipes (iOS-optimized)
    const EDGE_OVERDRAW = Math.max(24, Math.round(canvasSize.height * 0.03));
    
    // iOS optimization: reduce shadow effects
    if (!isIOS()) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }
    
    gameState.pipes.forEach(pipe => {
      const lockerImage = lockerImagesRef.current[0];
      
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
          ctx.drawImage(
            lockerImage,
            drawX,
            -drawY - targetHeight, // keep bottom aligned to gap start
            targetWidth,
            targetHeight + EDGE_OVERDRAW // extend upward offscreen to remove top gap
          );
          ctx.restore();
        } else {
          // Draw bottom locker normally, extend below screen to remove bottom gap
          ctx.drawImage(
            lockerImage,
            drawX,
            drawY,
            targetWidth,
            targetHeight + EDGE_OVERDRAW
          );
        }
        
        // Skip shadow on iOS for performance
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
      
      // Reset shadow (if not iOS)
      if (!isIOS()) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    });

    // Draw books (simplified on iOS)
    gameState.books.forEach(book => {
      if (!book.collected) {
        const bookSize = 32;
        ctx.save();

        if (isIOS()) {
          // Ultra-lightweight draw on iOS: simple filled circle
          ctx.beginPath();
          ctx.arc(book.x + bookSize/2, book.y - bookSize/2, bookSize/2, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
        } else {
          // Non-iOS: ring + emoji
          if (book.beingPulled) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 6;
            ctx.shadowColor = '#00FF00';
            ctx.shadowBlur = 12;
            const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
            ctx.globalAlpha = pulseIntensity;
          } else {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
          }
          ctx.beginPath();
          ctx.arc(book.x + bookSize/2, book.y - bookSize/2, bookSize/2 + 6, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = 1;
          ctx.font = `${bookSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📚', book.x + bookSize/2, book.y - bookSize/2);
        }

        ctx.restore();
      }
    });

    // Draw selected character or default nerd emoji
    ctx.save();
    
    // Get shop power status for visual effects
    const hasActiveGhostMode = hasGhostMode();
    const hasActiveShield = hasStartShield();
    const hasActiveMagnet = hasBookMagnet();
    
    // Draw simplified power effects for iOS performance
    if (hasActiveGhostMode && !isIOS()) {
      ctx.save();
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(
        gameState.bird.x + gameState.bird.width / 2,
        gameState.bird.y + gameState.bird.height / 2,
        BIRD_SIZE * 0.85,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      ctx.restore();
    }
    
    // Simplified shield effect for iOS
    if (hasActiveShield) {
      ctx.save();
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = isIOS() ? 3 : 5;
      ctx.globalAlpha = isIOS() ? 0.6 : 0.8;
      ctx.beginPath();
      ctx.arc(
        gameState.bird.x + gameState.bird.width / 2,
        gameState.bird.y + gameState.bird.height / 2,
        BIRD_SIZE * 0.8,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      ctx.restore();
    }
    
    // Simplified magnet effect for iOS
    if (hasActiveMagnet && !isIOS()) {
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFD700';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(
        gameState.bird.x + gameState.bird.width / 2,
        gameState.bird.y + gameState.bird.height / 2,
        BIRD_SIZE * 0.8,
        0,
        2 * Math.PI
      );
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
    ctx.fillText(
      character,
      gameState.bird.x + gameState.bird.width / 2,
      gameState.bird.y + gameState.bird.height / 2
    );
    
    // Draw crown if beating personal best
    if (gameState.crownCollected) {
      ctx.font = `${BIRD_SIZE * 0.6}px Arial`;
      ctx.fillText(
        '👑',
        gameState.bird.x + gameState.bird.width / 2,
        gameState.bird.y - 15
      );
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
      // Prevent native gestures and default behaviors to avoid stutter
      e.preventDefault();
      e.stopPropagation();
      
      // Allow taps anywhere when waiting for continue, otherwise only on canvas
      if (waitingForContinue || e.target === canvasRef.current) {
        jump();
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
      canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    }

    // Also add global event listener for waiting for continue
    if (waitingForContinue) {
      document.addEventListener('pointerdown', handlePointerDown, { passive: false });
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

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-b from-sky-start to-sky-end overflow-hidden"
      style={{
        // iOS-specific hardware acceleration
        ...(isIOS() && {
          WebkitTransform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          WebkitPerspective: '1000px'
        })
      }}
    >
      {/* Performance Monitor (iOS only) */}
      {isIOS() && (
        <div className="absolute top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
          <div>FPS: {performanceStats.fps}</div>
          <div>Frame: {performanceStats.frameTime.toFixed(1)}ms</div>
          {performanceStats.isStutter && <div className="text-red-400">STUTTER</div>}
        </div>
      )}
      
      {/* Game Canvas Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center touch-none"
        style={{ 
          width: '100vw',
          height: '100dvh',
          // iOS hardware acceleration
          ...(isIOS() && {
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            willChange: 'transform'
          })
        }}
      >
        <div
          className="relative border-2 sm:border-4 border-border rounded-lg sm:rounded-xl shadow-game bg-gradient-sky overflow-hidden touch-none"
          style={{ 
            width: canvasSize.width, 
            height: canvasSize.height,
            maxWidth: '100vw',
            maxHeight: '100svh',
            // iOS hardware acceleration
            ...(isIOS() && {
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform'
            })
          }}
        >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="block touch-none select-none w-full h-full"
          style={{ 
            touchAction: 'none', 
            WebkitTapHighlightColor: 'transparent', 
            imageRendering: isIOS() ? 'auto' : 'pixelated', // Smooth rendering on iOS
            width: canvasSize.width + 'px',
            height: canvasSize.height + 'px',
            // iOS-specific hardware acceleration optimizations
            ...(isIOS() && {
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              WebkitPerspective: '1000px',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            })
          }}
        />

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
          
          return (
            <>
              {/* All powers moved to top-right */}
              {displayPowers.length > 0 && (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 space-y-1">
                  {displayPowers.map((power, index) => (
                    <Card key={`${power.id}-${power.startTime}`} className="px-2 py-1 bg-accent/90 shadow-soft">
                      <div className="flex items-center space-x-1 text-xs sm:text-sm">
                        <span>{power.emoji}</span>
                        <span className="font-medium">{power.name}</span>
                        {(power.stackCount && power.stackCount > 1) && (
                          <span className="bg-warning text-warning-foreground px-1 rounded text-xs font-bold">
                            x{power.stackCount}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {/* Game Over Screen */}
        {gameState.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-lg">
            <Card className="p-3 sm:p-4 md:p-8 text-center space-y-2 sm:space-y-3 md:space-y-4 animate-bounce-in shadow-game max-w-sm mx-2 sm:mx-4">
              <div className="text-3xl sm:text-4xl">💥</div>
              {gameState.isNewRecord ? (
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-warning">New Record! 👑</h2>
              ) : (
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-danger">Game Over!</h2>
              )}
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                {gameState.isNewRecord ? '"I\'m the smartest nerd ever!"' : '"I should\'ve studied more!"'}
              </p>
              <div className="text-base sm:text-lg md:text-xl font-semibold">
                Final Score: {gameState.score}
              </div>
              {gameState.record > 0 && !gameState.isNewRecord && (
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Record: {gameState.record} 👑
                </div>
              )}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button 
                  onClick={resetGame}
                  variant="default"
                  size="lg"
                  className="bg-gradient-button shadow-glow flex-1 text-sm sm:text-base"
                >
                  Try Again 🎮
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  size="lg"
                  className="flex-1 text-sm sm:text-base"
                >
                  Main Menu 🏠
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Start Screen */}
        {!gameState.gameStarted && !gameState.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 rounded-lg">
            <Card className="p-3 sm:p-4 md:p-8 text-center space-y-2 sm:space-y-3 md:space-y-4 animate-bounce-in shadow-game max-w-md mx-2 sm:mx-4">
              <div className="text-4xl sm:text-5xl md:text-6xl">🤓</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">Slappy Nerds</h1>
              <p className="text-xs sm:text-sm md:text-lg text-muted-foreground px-2">
                Help your nerdy hero soar through the skies! Tap to flap and avoid obstacles.
              </p>
              <div className="space-y-1 sm:space-y-2 text-xs md:text-sm text-muted-foreground">
                <p>📱 Tap anywhere to flap</p>
                <p className="hidden sm:block">🖥️ Or press SPACE on desktop</p>
                <p>📚 Avoid the green pipes!</p>
              </div>
              <Button 
                onClick={jump}
                variant="default"
                size="lg"
                className="bg-gradient-button shadow-glow animate-pulse-glow w-full text-sm sm:text-base"
              >
                Start Flying! 🚀
              </Button>
            </Card>
          </div>
        )}

        {/* Power Selection Modal */}
        <PowerSelection
          isOpen={showPowerSelection}
          powers={powerChoices}
          onSelectPower={handlePowerSelect}
        />

        {/* Tap to Continue Modal */}
        {waitingForContinue && pendingPower && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 z-50 rounded-lg">
            <Card className="p-6 sm:p-8 text-center space-y-4 animate-scale-in shadow-game max-w-sm mx-4">
              <div className="text-4xl sm:text-5xl">{pendingPower.emoji}</div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                {pendingPower.name} Ready!
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {pendingPower.description}
              </p>
              <div className="text-lg sm:text-xl font-semibold text-accent-foreground animate-pulse">
                Tap to Continue
              </div>
              <div className="text-sm text-muted-foreground">
                📱 Tap anywhere or press SPACE
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Game;