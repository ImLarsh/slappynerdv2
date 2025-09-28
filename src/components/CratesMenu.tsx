import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { CrateOpening } from './CrateOpening';
import { useToast } from '@/hooks/use-toast';

interface Crate {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  is_available: boolean;
}

interface CratesMenuProps {
  onBack?: () => void;
}

export const CratesMenu = ({ onBack }: CratesMenuProps) => {
  const [crates, setCrates] = useState<Crate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrate, setSelectedCrate] = useState<Crate | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const { books, refetch } = useCurrency();
  const { toast } = useToast();

  useEffect(() => {
    fetchCrates();
  }, []);

  const fetchCrates = async () => {
    try {
      const { data, error } = await supabase
        .from('crates')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching crates:', error);
        toast({
          title: "Error",
          description: "Failed to load crates",
          variant: "destructive"
        });
      } else {
        setCrates(data || []);
      }
    } catch (error) {
      console.error('Error in fetchCrates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCrate = (crate: Crate) => {
    if (books < crate.price) {
      toast({
        title: "Insufficient Books",
        description: `You need ${crate.price} books to open this crate. You have ${books} books.`,
        variant: "destructive"
      });
      return;
    }

    setSelectedCrate(crate);
    setIsOpening(true);
  };

  const handleOpeningComplete = () => {
    setIsOpening(false);
    setSelectedCrate(null);
    refetch(); // Refresh books balance
  };

  if (isOpening && selectedCrate) {
    return (
      <CrateOpening 
        crate={selectedCrate} 
        onComplete={handleOpeningComplete}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-muted-foreground">Loading crates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          {onBack && (
            <div className="flex items-center mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBack}
                className="text-xs md:text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          )}
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            📦 Crates Menu
          </h1>
          <p className="text-muted-foreground mb-4">
            Open mystery crates to get exclusive rewards!
          </p>
          <div className="text-lg font-semibold">
            📚 Books: <span className="text-primary">{books}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crates.map((crate) => (
            <Card key={crate.id} className="bg-card/80 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="text-6xl mb-2">{crate.emoji}</div>
                <CardTitle className="text-xl">{crate.name}</CardTitle>
                <CardDescription>{crate.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-primary">
                    📚 {crate.price} Books
                  </div>
                </div>
                <Button 
                  onClick={() => handleOpenCrate(crate)}
                  disabled={books < crate.price}
                  className="w-full"
                  variant={books >= crate.price ? "default" : "outline"}
                >
                  {books >= crate.price ? "Open Crate" : "Not Enough Books"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {crates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">No Crates Available</h3>
            <p className="text-muted-foreground">
              Check back later for new crates to open!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};