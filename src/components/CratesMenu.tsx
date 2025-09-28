import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export const CratesMenu = () => {
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
      <div className="text-center py-8">
        <div className="text-4xl animate-pulse">📦</div>
        <p className="text-muted-foreground mt-2">Loading crates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-yellow-500 mb-2">Mystery Crates</h3>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xl">📚</span>
          <span className="text-lg font-semibold text-yellow-500">{books} Books</span>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[60vh]">
        <div className="grid grid-cols-2 gap-3 p-1">
          {crates.map(crate => {
            const canAfford = books >= crate.price;
            return (
              <Card 
                key={crate.id} 
                className={`relative p-4 text-center transition-all duration-300 cursor-pointer ${
                  canAfford 
                    ? 'hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/50 border-yellow-400/30' 
                    : 'opacity-60 cursor-not-allowed border-muted/30'
                }`} 
                onClick={() => canAfford && handleOpenCrate(crate)}
              >
                {!canAfford && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <span className="text-xs text-muted-foreground font-medium">Not enough books</span>
                  </div>
                )}
                
                <div className="text-4xl mb-2 animate-pulse flex justify-center items-center h-16">
                  {crate.emoji}
                </div>
                
                <h4 className="font-semibold text-sm mb-1 text-yellow-500">{crate.name}</h4>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {crate.description}
                </p>

                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-xs font-medium">📚 {crate.price}</span>
                </div>
                
                {canAfford && (
                  <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                    Open Crate
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {crates.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-2">
            <div className="text-6xl">📦</div>
            <h3 className="text-xl font-semibold text-yellow-500">No Crates Available</h3>
            <p className="text-muted-foreground">
              Check back later for new crates to open!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};