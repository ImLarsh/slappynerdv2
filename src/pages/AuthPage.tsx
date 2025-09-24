import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import schoolHallwayBg from '@/assets/school-hallway-bg.png';
import slappyNerdsTitle from '@/assets/slappy-nerds-title.png';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        toast({
          title: "Welcome to Slappy Nerds!",
          description: "You're now logged in and ready to play.",
        });
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Lock body scroll on Auth page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const validatePlayerName = (name: string): boolean => {
    if (name.length < 2 || name.length > 20) {
      setError('Player name must be between 2 and 20 characters');
      return false;
    }
    
    const inappropriateWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell'];
    const lowercaseName = name.toLowerCase();
    
    if (inappropriateWords.some(word => lowercaseName.includes(word))) {
      setError('Please choose an appropriate player name');
      return false;
    }
    
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }
      } else {
        if (!validatePlayerName(playerName)) {
          return;
        }

        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              player_name: playerName,
            }
          }
        });

        if (error) {
          setError(error.message);
          return;
        }

        // If email confirmation is disabled, user will be automatically logged in
        // If email confirmation is enabled, user needs to check email
        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: "Welcome to Slappy Nerds!",
            description: "Your account has been created! You can start playing immediately.",
          });
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-3 md:p-4" style={{
      backgroundImage: `url(${schoolHallwayBg})`
    }}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      
      <div className="w-full max-w-sm md:max-w-md space-y-2 md:space-y-6 relative z-10 max-h-full overflow-hidden">
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex justify-center">
            <img src={slappyNerdsTitle} alt="Slappy Nerds" className="w-full max-w-[220px] md:max-w-sm mx-auto" />
          </div>
          <div className="retro-card bg-background/80 backdrop-blur-md p-3 md:p-4 rounded-lg border border-primary/30">
            <p className="text-base md:text-lg font-semibold text-primary">
              {isLogin ? '🎮 WELCOME BACK, NERD!' : '🚀 JOIN THE NERD SQUAD!'}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {isLogin ? 'Ready to slap some more nerds?' : 'Time to prove your nerd powers!'}
            </p>
          </div>
        </div>

        <div className="retro-card bg-background/90 backdrop-blur-lg p-3 md:p-6 space-y-3 md:space-y-4 border-2 border-primary/40 shadow-lg shadow-primary/20">
          <form onSubmit={handleAuth} className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-primary">
                📧 EMAIL ADDRESS
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nerd@example.com"
                required
                disabled={loading}
                className="bg-background/80 border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-bold text-primary">
                🔒 SECRET PASSWORD
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Super secret nerd code..."
                required
                disabled={loading}
                minLength={6}
                className="bg-background/80 border-primary/30 focus:border-primary"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="playerName" className="text-sm font-bold text-primary">
                  🤓 NERD NAME
                </label>
                <Input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Choose your nerd identity..."
                  required
                  disabled={loading}
                  minLength={2}
                  maxLength={20}
                  className="bg-background/80 border-primary/30 focus:border-primary"
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="bg-destructive/20 border-destructive/50">
                <AlertDescription className="text-destructive font-semibold">⚠️ {error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-lg py-2 md:py-3"
              disabled={loading}
            >
              {loading ? '⏳ LOADING...' : (isLogin ? '🎮 ENTER GAME' : '🚀 JOIN BATTLE')}
            </Button>
          </form>

          <div className="text-center bg-primary/10 p-2 md:p-3 rounded-lg border border-primary/30">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-xs md:text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
              disabled={loading}
            >
              {isLogin 
                ? "🆕 NEW NERD? CREATE ACCOUNT!" 
                : "🎮 RETURNING NERD? SIGN IN!"
              }
            </button>
          </div>
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/20 hover:border-primary text-primary font-bold" 
            onClick={() => navigate('/')}
            disabled={loading}
          >
            🎮 BACK TO GAME
          </Button>
        </div>
      </div>
    </div>
  );
}