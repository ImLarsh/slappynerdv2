import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { useCharactersContext } from '@/context/CharactersContext';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  item_type: string;
  item_data: any;
  emoji: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const Shop: React.FC = () => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'characters' | 'powerups' | null>(null);
  const {
    books,
    spendBooks,
    loading: booksLoading
  } = useCurrency();
  const { toast } = useToast();
  const { fetchUserData } = useCharactersContext();

  const fetchShopData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch shop items
      const { data: items, error: itemsError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');

      if (itemsError) {
        console.error('Error fetching shop items:', itemsError);
        return;
      }
      setShopItems(items || []);

      // Fetch user purchases if logged in
      if (user) {
        const { data: purchases, error: purchasesError } = await supabase
          .from('user_purchases')
          .select('shop_item_id')
          .eq('user_id', user.id);

        if (purchasesError) {
          console.error('Error fetching purchases:', purchasesError);
        } else {
          setUserPurchases(purchases?.map(p => p.shop_item_id) || []);
        }
      }
    } catch (error) {
      console.error('Error in fetchShopData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to make purchases",
          variant: "destructive"
        });
        return;
      }

      if (books < item.price) {
        toast({
          title: "Not enough books!",
          description: `You need ${item.price} books, but only have ${books}`,
          variant: "destructive"
        });
        return;
      }

      if (userPurchases.includes(item.id)) {
        toast({
          title: "Already owned",
          description: "You already own this item!",
          variant: "destructive"
        });
        return;
      }

      // Purchase the item
      const success = await spendBooks(item.price);
      if (!success) {
        toast({
          title: "Purchase failed",
          description: "Failed to complete purchase",
          variant: "destructive"
        });
        return;
      }

      // Record the purchase
      const { error } = await supabase.from('user_purchases').insert({
        user_id: user.id,
        shop_item_id: item.id
      });

      if (error) {
        console.error('Error recording purchase:', error);
        return;
      }

      // If it's a character item, also unlock it in user_characters
      if (item.item_type === 'character' && item.item_data?.character_id) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('player_name')
          .eq('id', currentUser?.id)
          .single();

        const { error: characterError } = await supabase.from('user_characters').insert({
          user_id: user.id,
          character_id: item.item_data.character_id,
          player_name: profile?.player_name || 'Player'
        });

        if (characterError) {
          console.error('Error unlocking character:', characterError);
        } else {
          // Refresh character data to show the newly unlocked character
          await fetchUserData();
        }
      }

      setUserPurchases(prev => [...prev, item.id]);
      toast({
        title: "Purchase successful! 🎉",
        description: `You bought ${item.name} for ${item.price} books!`
      });
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast({
        title: "Purchase failed",
        description: "An error occurred during purchase",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  if (loading || booksLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl animate-pulse">🛍️</div>
        <p className="text-muted-foreground mt-2">Loading shop...</p>
      </div>
    );
  }

  // Filter items based on selected category and sort by price (least to most expensive)
  const filteredItems = selectedCategory 
    ? shopItems
        .filter(item => {
          // Map category names to database item_type values
          const itemType = selectedCategory === 'characters' ? 'character' : 'power';
          return item.item_type === itemType;
        })
        .sort((a, b) => a.price - b.price) // Sort by price ascending
    : [];

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-yellow-500 mb-2">Nerd Shop 🛍️</h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl">📚</span>
            <span className="text-lg font-semibold text-yellow-500">{books} Books</span>
          </div>
          <p className="text-muted-foreground">Choose a category to browse:</p>
        </div>

        <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
          <Card 
            className="p-6 hover:bg-accent transition-colors cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/50 border-yellow-400/30" 
            onClick={() => setSelectedCategory('characters')}
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">🎭</div>
              <h3 className="text-xl font-bold text-yellow-500">Characters</h3>
              <p className="text-muted-foreground">Unlock new characters to play as</p>
              <Badge variant="outline" className="text-yellow-500 border-yellow-400">
                {shopItems.filter(item => item.item_type === 'character').length} available
              </Badge>
            </div>
          </Card>

          <Card 
            className="p-6 hover:bg-accent transition-colors cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/50 border-yellow-400/30" 
            onClick={() => setSelectedCategory('powerups')}
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">⚡</div>
              <h3 className="text-xl font-bold text-yellow-500">Powerups</h3>
              <p className="text-muted-foreground">Get permanent game advantages</p>
              <Badge variant="outline" className="text-yellow-500 border-yellow-400">
                {shopItems.filter(item => item.item_type === 'power').length} available
              </Badge>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Category items view
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedCategory(null)}
            className="bg-red-500/90 hover:bg-red-600/90 text-white border-red-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h3 className="text-xl font-bold text-yellow-500">
            {selectedCategory === 'characters' ? '🎭 Characters' : '⚡ Powerups'}
          </h3>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">📚</span>
          <span className="text-lg font-semibold text-yellow-500">{books} Books</span>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[60vh]">
        <div className="grid grid-cols-2 gap-3 p-1">
          {filteredItems.map(item => {
            const isPurchased = userPurchases.includes(item.id);
            const canAfford = books >= item.price;
            
            return (
              <Card 
                key={item.id} 
                className={`relative p-4 text-center transition-all duration-300 cursor-pointer ${
                  isPurchased 
                    ? 'ring-2 ring-green-500 bg-green-500/10 scale-105 border-green-400/30' 
                    : canAfford 
                      ? 'hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/50 border-yellow-400/30' 
                      : 'opacity-60 cursor-not-allowed border-muted/30'
                }`} 
                onClick={() => !isPurchased && canAfford && handlePurchase(item)}
              >
                {!canAfford && !isPurchased && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <span className="text-xs text-muted-foreground font-medium">Can't afford</span>
                  </div>
                )}
                
                <div className="text-4xl mb-2 animate-pulse flex justify-center items-center h-16">
                  {item.emoji}
                </div>
                
                <h4 className="font-semibold text-sm mb-1 text-yellow-500">{item.name}</h4>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-xs font-medium">📚 {item.price}</span>
                </div>
                
                {isPurchased ? (
                  <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                    Owned ✓
                  </Badge>
                ) : canAfford ? (
                  <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-600">
                    Buy Now
                  </Badge>
                ) : null}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {filteredItems.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-2">
            <div className="text-6xl">
              {selectedCategory === 'characters' ? '🎭' : '⚡'}
            </div>
            <h3 className="text-xl font-semibold text-yellow-500">No Items Available</h3>
            <p className="text-muted-foreground">
              No {selectedCategory} available in the shop right now.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};