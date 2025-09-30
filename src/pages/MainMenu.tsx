import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { CharacterSelection } from '@/components/CharacterSelection';
import { AchievementsTab } from '@/components/AchievementsTab';
import { FallingEmojis } from '@/components/FallingEmojis';
import { Leaderboards } from '@/components/Leaderboards';
import { Shop } from '@/components/Shop';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { useCharactersContext } from '@/context/CharactersContext';
import { useCharacterImage } from '@/hooks/useCharacterImage';
import { useAudio } from '@/hooks/useAudio';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPanel } from '@/components/AdminPanel';
import { CratesMenu } from '@/components/CratesMenu';
import { supabase } from '@/integrations/supabase/client';
import schoolHallwayBg from '@/assets/school-hallway-bg.png';
import slappyNerdsTitle from '@/assets/slappy-nerds-title-new.png';
import { Gamepad2, Trophy, Users, Play, ShoppingCart, Volume2, VolumeX, DoorOpen, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '@/hooks/usePWA';
const MainMenuCharacterDisplay: React.FC<{
  character: any;
}> = ({
  character
}) => {
  const {
    imageUrl,
    isLoading
  } = useCharacterImage(character?.image_path);
  if (isLoading) {
    return <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl hover-scale sm:py-3 md:py-4 lg:py-[21px] my-[8px] mx-0 px-0 py-[16px] flex items-center justify-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 animate-pulse bg-gray-200 rounded"></div>
      </div>;
  }
  if (imageUrl) {
    return <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl hover-scale sm:py-3 md:py-4 lg:py-[21px] my-[8px] mx-0 px-0 py-[16px] flex items-center justify-center">
        <img src={imageUrl} alt={character?.name || "Character"} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain" style={{
        imageRendering: 'pixelated'
      }} />
      </div>;
  }
  return <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl hover-scale sm:py-3 md:py-4 lg:py-[21px] my-[8px] mx-0 px-0 py-[16px]">
      {character?.emoji || '🤓'}
    </div>;
};
const MainMenu: React.FC = () => {
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [cratesOpen, setCratesOpen] = useState(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [popCounter, setPopCounter] = useState(0);
  const {
    books,
    loading: booksLoading
  } = useCurrency();
  const {
    user,
    loading: authLoading,
    signOut
  } = useAuth();
  const {
    selectedCharacter
  } = useCharactersContext();
  const {
    isAdmin,
    loading: adminLoading
  } = useAdmin();
  const {
    volume,
    isMuted,
    isPlaying,
    setVolume,
    toggleMute,
    playBackgroundMusic,
    stopBackgroundMusic,
    playSound,
    startMusicOnInteraction
  } = useAudio();
  const {
    isInstallable,
    installApp,
    showIOSInstructions,
    setShowIOSInstructions,
    isIOS
  } = usePWA();
  const navigate = useNavigate();

  // Fetch player profile data
  useEffect(() => {
    const fetchPlayerProfile = async () => {
      if (!user) return;
      try {
        const {
          data: profile
        } = await supabase.from('profiles').select('player_name').eq('id', user.id).single();
        if (profile) {
          setPlayerName(profile.player_name);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchPlayerProfile();
  }, [user]);
  // No automatic music - only controlled via player controls

  // Lock body scroll on Main Menu
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-start music on component mount for mobile
  useEffect(() => {
    // Add a click listener to start music on any user interaction
    const handleFirstInteraction = () => {
      startMusicOnInteraction();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [startMusicOnInteraction]);
  const handleStartGame = () => {
    // Start music on user interaction (mobile-friendly)
    startMusicOnInteraction();
    // Play click sound for play button
    playSound('click');
    navigate('/game');
  };
  const handleButtonClick = (action: () => void) => {
    // Play click sound for menu interactions
    playSound('click');
    action();
  };
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold animate-scale-in">🤓 Slappy Nerds</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <>
    <div className="min-h-screen h-screen overflow-hidden bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-1 sm:p-2 md:p-4" style={{
      backgroundImage: `url(${schoolHallwayBg})`
    }}>
      {/* Falling Emojis Background */}
      <FallingEmojis onEmojiPop={() => setPopCounter(prev => prev + 1)} />
      
      {/* Background overlay - no blur to avoid affecting emojis */}
      <div className="absolute inset-0 bg-background/60 z-1" />
      
      {/* Pop Counter - Responsive positioning */}
      <div className="absolute top-4 sm:top-6 md:top-8 lg:top-4 xl:top-6 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md px-4">
        <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white rounded-lg px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 border border-purple-300 shadow-xl w-fit mx-auto md:py-[9px] my-[38px]">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <span className="text-sm sm:text-base md:text-lg lg:text-xl">💥</span>
            <span className="font-bold text-xs sm:text-sm md:text-base lg:text-lg whitespace-nowrap">
              {popCounter} Pops
            </span>
          </div>
        </div>
      </div>

      {/* User Info - Responsive positioning */}
      {user && <div className="absolute top-16 sm:top-20 md:top-24 lg:top-16 xl:top-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md px-4">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 border border-primary/30 w-fit mx-auto my-[46px]">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-center text-[#fc0101] font-extrabold whitespace-nowrap">
              {playerName || 'Player'}
            </p>
            {/* Currency Display */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">
              <span className="text-sm sm:text-base md:text-lg lg:text-xl">📚</span>
              <span className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold whitespace-nowrap">
                {booksLoading ? '...' : books} Books
              </span>
            </div>
          </div>
        </div>}

      {/* Title - Responsive positioning and sizing */}
      <div className="absolute top-32 sm:top-40 md:top-48 lg:top-36 xl:top-44 left-0 right-0 z-10 animate-fade-in px-4">
        <img src={slappyNerdsTitle} alt="Slappy Nerds" className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px] xl:max-w-[400px] 2xl:max-w-[500px] mx-auto hover-scale object-contain" />
      </div>


      {/* Add to Home Screen Button - Only show on mobile when installable */}
      {isInstallable && <Button variant="outline" size="icon" className="absolute top-8 sm:top-12 md:top-16 right-8 sm:right-12 md:right-16 z-20 hover-scale w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-green-500 hover:bg-green-600 border-green-400 text-white" onClick={() => handleButtonClick(installApp)}>
          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
        </Button>}
      
      {/* Sign Out Button - Red Door Icon */}
      
      
      {/* Centered Content */}
      <div className="relative z-10 w-full max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 text-center mt-52 sm:mt-60 md:mt-72 lg:mt-56 xl:mt-64 px-4 sm:px-6 md:px-8">{/* Character and Description */}
        {/* Character and Description */}
        <div className="space-y-2 md:space-y-4 animate-fade-in">
          
          
        </div>

        {/* Admin Panel - Only show for admins */}
        {isAdmin && !adminLoading && <AdminPanel />}

        {/* Main Action Buttons */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Selected Character Display */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 animate-fade-in" style={{
            animationDelay: '0.6s'
          }}>
            <div className="relative w-full flex justify-center">
              <MainMenuCharacterDisplay character={selectedCharacter} />
            </div>
          </div>

          <div className="relative">
            <Button onClick={handleStartGame} size="lg" className="relative w-full min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl py-3 sm:py-4 md:py-5 lg:py-6 hover-scale animate-scale-in bg-gradient-to-b from-red-400 via-red-500 to-red-600 text-red-900 font-black shadow-2xl border-2 sm:border-3 md:border-4 border-red-300 overflow-hidden transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 md:gap-4" style={{
              animationDelay: '0.1s'
            }}>
              <Play className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 font-bold stroke-[3]" />
              Play!
              {/* Enhanced 3D bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-2 md:h-3 lg:h-4 bg-gradient-to-r from-red-600 to-red-700"></div>
            </Button>
            
            {/* Volume Control Button - Top Right of Play Button */}
            <Button variant="outline" size="icon" onClick={() => handleButtonClick(() => setVolumeOpen(true))} className="absolute -top-12 sm:-top-14 md:-top-16 lg:-top-18 -right-1 sm:-right-2 md:-right-3 lg:-right-4 z-30 hover-scale w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-primary text-primary-foreground border-2 border-primary-foreground shadow-xl">
              {isMuted ? <VolumeX className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" /> : <Volume2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" />}
            </Button>
          </div>

          {/* Game Feature Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-5 w-full">
            <Button variant="default" onClick={() => handleButtonClick(() => setCharactersOpen(true))} disabled={!user} className="relative flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem] hover-scale animate-scale-in text-sm sm:text-base md:text-lg lg:text-xl bg-gradient-to-b from-green-400 via-green-500 to-green-600 text-green-900 font-bold shadow-xl border-2 border-green-300 overflow-hidden" style={{
              animationDelay: '0.2s'
            }}>
              <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 font-bold stroke-[3]" />
              <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg">Characters</span>
              {/* 3D bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-r from-green-600 to-green-700"></div>
            </Button>

            <Button variant="default" onClick={() => handleButtonClick(() => setShopOpen(true))} disabled={!user} className="relative flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem] hover-scale animate-scale-in text-sm sm:text-base md:text-lg lg:text-xl bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-purple-900 font-bold shadow-xl border-2 border-purple-300 overflow-hidden" style={{
              animationDelay: '0.3s'
            }}>
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 font-bold stroke-[3]" />
              <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg">Shop</span>
              {/* 3D bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-r from-purple-600 to-purple-700"></div>
            </Button>

            <Button variant="default" onClick={() => handleButtonClick(() => setCratesOpen(true))} disabled={!user} className="relative flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem] hover-scale animate-scale-in text-sm sm:text-base md:text-lg lg:text-xl bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-orange-900 font-bold shadow-xl border-2 border-orange-300 overflow-hidden" style={{
              animationDelay: '0.35s'
            }}>
              <Package className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 font-bold stroke-[3]" />
              <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg">Crates</span>
              {/* 3D bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-r from-orange-600 to-orange-700"></div>
            </Button>

            <Button variant="default" onClick={() => handleButtonClick(() => setAchievementsOpen(true))} disabled={!user} className="relative flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem] hover-scale animate-scale-in text-sm sm:text-base md:text-lg lg:text-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-900 font-bold shadow-xl border-2 border-amber-300 overflow-hidden" style={{
              animationDelay: '0.4s'
            }}>
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 font-bold stroke-[3]" />
              <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg">Achievements</span>
              {/* 3D bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-r from-amber-600 to-amber-700"></div>
            </Button>

            <Button variant="default" onClick={() => handleButtonClick(() => setLeaderboardOpen(true))} className="relative flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[3.5rem] sm:min-h-[4rem] md:min-h-[5rem] lg:min-h-[6rem] hover-scale animate-scale-in text-sm sm:text-base md:text-lg lg:text-xl bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 font-bold shadow-xl border-2 border-yellow-300 overflow-hidden col-span-2" style={{
              animationDelay: '0.5s'
            }}>
              {/* Crown icon */}
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black">👑</div>
              
              {/* Extended bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-r from-yellow-600 to-yellow-700"></div>
            </Button>
          </div>

          {/* Sign In/Up Button - Below play button (when not signed in) */}
          {!user && <Button onClick={() => handleButtonClick(() => navigate('/auth'))} variant="default" size="lg" className="w-full text-base sm:text-lg md:text-xl lg:text-2xl py-2 sm:py-3 md:py-4 hover-scale animate-scale-in bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white font-black shadow-2xl border-2 sm:border-3 border-blue-300 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3" style={{
            animationDelay: '0.15s'
          }}>
              🔐 Sign In / Sign Up
            </Button>}

          {/* Logout Button - Below leaderboard (when signed in) */}
          {user && <div className="mt-2 sm:mt-3 md:mt-4">
            <Button onClick={() => handleButtonClick(signOut)} variant="outline" size="lg" className="w-full text-base sm:text-lg md:text-xl lg:text-2xl py-2 sm:py-3 md:py-4 hover-scale animate-scale-in text-red-600 border-red-500 hover:bg-red-500 hover:text-white font-black shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3" style={{
              animationDelay: '0.6s'
            }}>
                <DoorOpen className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 font-bold stroke-[3]" />
                Sign Out
              </Button>
            </div>}
        </div>
        </div>
      </div>

      {/* Character Selection Full Screen */}
      <Dialog open={charactersOpen} onOpenChange={setCharactersOpen}>
        <DialogContent overlayClassName="bg-gray-900/40 backdrop-blur-sm" className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 animate-scale-in bg-transparent border-none shadow-none sm:rounded-none">
          <CharacterSelection onClose={() => setCharactersOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] md:max-h-[80vh] overflow-hidden animate-scale-in">
          <DialogHeader>
            
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-80px)] md:max-h-[calc(80vh-80px)]">
            <Shop onBack={() => setShopOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={achievementsOpen} onOpenChange={setAchievementsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle>Achievements</DialogTitle>
          </DialogHeader>
          <AchievementsTab onBack={() => setAchievementsOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden animate-scale-in">
          <DialogHeader>
            
          </DialogHeader>
          <Leaderboards onBack={() => setLeaderboardOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Crates Menu Dialog */}
      <Dialog open={cratesOpen} onOpenChange={setCratesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden animate-scale-in p-0">
          <CratesMenu onBack={() => setCratesOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Volume Control Dialog */}
      <Dialog open={volumeOpen} onOpenChange={setVolumeOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>Audio Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <Slider value={[volume]} onValueChange={value => setVolume(value[0])} max={1} min={0} step={0.1} className="w-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mute All Sounds</span>
              <Button variant="outline" size="sm" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Background Music</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {isPlaying ? 'Playing' : 'Stopped'}
                </span>
                <Button variant="outline" size="sm" onClick={isPlaying ? stopBackgroundMusic : playBackgroundMusic}>
                  {isPlaying ? "⏸️" : "▶️"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS Installation Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>Add to Home Screen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To install Slappy Nerds on your iOS device:
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share</strong> button <span className="inline-block w-4 h-4 bg-blue-500 text-white text-xs rounded text-center leading-4">⎋</span> at the bottom of Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> in the top right corner</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-4">
              The game will then appear on your home screen like a native app!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default MainMenu;