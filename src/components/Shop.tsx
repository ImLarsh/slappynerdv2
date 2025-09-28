import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { useCharactersContext } from '@/context/CharactersContext';
import { useCharacterImage } from '@/hooks/useCharacterImage';
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
const ShopItemDisplay: React.FC<{
  item: ShopItem;
}> = ({
  item
}) => {
  const [characterImagePath, setCharacterImagePath] = useState<string | null>(null);
  const {
    imageUrl,
    isLoading
  } = useCharacterImage(characterImagePath);
  useEffect(() => {
    if (item.item_type === 'character' && item.item_data?.character_id) {
      // Fetch character image path from characters table
      supabase.from('characters').select('image_path').eq('id', item.item_data.character_id).single().then(({
        data
      }) => {
        if (data?.image_path) {
          setCharacterImagePath(data.image_path);
        }
      });
    }
  }, [item]);
  if (item.item_type === 'character' && characterImagePath) {
    if (isLoading) {
      return <div className="w-8 h-8 md:w-12 md:h-12 bg-muted rounded animate-pulse"></div>;
    }
    if (imageUrl) {
      return <img src={imageUrl} alt={item.name} className="w-8 h-8 md:w-12 md:h-12 object-contain" />;
    }
  }

  // Fallback to emoji for powerups or if image fails to load
  return <span className="text-2xl md:text-3xl">{item.emoji}</span>;
};
interface ShopProps {
  onBack?: () => void;
}

export const Shop: React.FC<ShopProps> = ({ onBack }) => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'characters' | 'powerups' | null>(null);
  const {
    books,
    spendBooks,
    loading: booksLoading
  } = useCurrency();
  const {
    toast
  } = useToast();
  const {
    fetchUserData
  } = useCharactersContext();
  const fetchShopData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      // Fetch shop items
      const {
        data: items,
        error: itemsError
      } = await supabase.from('shop_items').select('*').eq('is_available', true).order('sort_order');
      if (itemsError) {
        console.error('Error fetching shop items:', itemsError);
        return;
      }
      setShopItems(items || []);

      // Fetch user purchases if logged in
      if (user) {
        const {
          data: purchases,
          error: purchasesError
        } = await supabase.from('user_purchases').select('shop_item_id').eq('user_id', user.id);
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
      const {
        error
      } = await supabase.from('user_purchases').insert({
        user_id: user.id,
        shop_item_id: item.id
      });
      if (error) {
        console.error('Error recording purchase:', error);
        // Refund books since recording failed
        // Note: This is a simple approach, in production you'd want more robust error handling
        return;
      }

      // If it's a character item, also unlock it in user_characters
      if (item.item_type === 'character' && item.item_data?.character_id) {
        const {
          data: {
            user: currentUser
          }
        } = await supabase.auth.getUser();
        const {
          data: profile
        } = await supabase.from('profiles').select('player_name').eq('id', currentUser?.id).single();
        const {
          error: characterError
        } = await supabase.from('user_characters').insert({
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
    return <div className="p-6 text-center">
        <div className="text-2xl">📚</div>
        <p>Loading shop...</p>
      </div>;
  }
  // Filter items based on selected category and sort by price (least to most expensive)
  const filteredItems = selectedCategory ? shopItems.filter(item => {
    // Map category names to database item_type values
    const itemType = selectedCategory === 'characters' ? 'character' : 'power';
    return item.item_type === itemType;
  }).sort((a, b) => a.price - b.price) // Sort by price ascending
  : [];

  // Category selection view
  if (!selectedCategory) {
    return <div className="p-4 h-full flex flex-col">
        <div className="text-center mb-6">
          {onBack && (
            <div className="flex items-center mb-3">
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
          <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">Nerd Shop 🛍️</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl md:text-2xl">📚</span>
            <span className="text-lg md:text-xl font-semibold">{books} Books</span>
          </div>
          <p className="text-muted-foreground">Choose a category to browse:</p>
        </div>

        <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer" onClick={() => setSelectedCategory('characters')}>
            <div className="text-center space-y-3">
              <div className="text-4xl">🎭</div>
              <h3 className="text-xl font-bold">Characters</h3>
              <p className="text-muted-foreground">Unlock new characters to play as</p>
              
            </div>
          </Card>

          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer" onClick={() => setSelectedCategory('powerups')}>
            <div className="text-center space-y-3">
              <div className="text-4xl">⚡</div>
              <h3 className="text-xl font-bold">Powerups</h3>
              <p className="text-muted-foreground">Get permanent game advantages</p>
              
            </div>
          </Card>
        </div>
      </div>;
  }

  // Category items view
  return <div className="p-2 md:p-4 h-full flex flex-col">
      <div className="text-center mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)} className="text-xs md:text-sm">
            ← Back
          </Button>
          
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl md:text-2xl">📚</span>
          <span className="text-lg md:text-xl font-semibold">{books} Books</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 auto-rows-max">
        {filteredItems.map(item => {
        const isPurchased = userPurchases.includes(item.id);
        const canAfford = books >= item.price;
        return <Card key={item.id} className="p-2 md:p-3 flex flex-col h-full">
              <div className="flex flex-col gap-2 flex-1">
                <div className="text-center flex justify-center">
                  <ShopItemDisplay item={item} />
                </div>
                <div className="flex-1 text-center">
                  <h3 className="font-semibold text-xs md:text-sm mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-xs font-medium">📚 {item.price}</span>
                  </div>
                </div>
              </div>
              
              <Button onClick={() => handlePurchase(item)} disabled={isPurchased || !canAfford} variant={isPurchased ? "outline" : canAfford ? "default" : "destructive"} size="sm" className="w-full text-xs md:text-sm">
                {isPurchased ? "Owned ✓" : canAfford ? "Buy" : "Can't Afford"}
              </Button>
            </Card>;
      })}
      </div>

      {filteredItems.length === 0 && <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <p>No {selectedCategory} available in the shop right now.</p>
        </div>}
    </div>;
};