import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ShopPower {
  id: string;
  power_id: string;
  name: string;
  description: string;
  duration?: number;
  delay?: number;
}

export const useShopPowers = () => {
  const [ownedPowers, setOwnedPowers] = useState<ShopPower[]>([]);
  const [activePowers, setActivePowers] = useState<ShopPower[]>([]);
  const [bookSeenTimes, setBookSeenTimes] = useState<Map<string, number>>(new Map());
  const { user } = useAuth();

  // Fetch owned powers from shop purchases
  const fetchOwnedPowers = useCallback(async () => {
    if (!user) return;

    try {
      const { data: purchases, error: purchasesError } = await supabase
        .from('user_purchases')
        .select(`
          shop_item_id,
          shop_items!inner(
            id,
            item_type,
            item_data
          )
        `)
        .eq('user_id', user.id)
        .eq('shop_items.item_type', 'power');

      if (purchasesError) {
        console.error('Error fetching owned powers:', purchasesError);
        return;
      }

      const powers: ShopPower[] = purchases?.map(p => {
        const itemData = p.shop_items.item_data as any;
        return {
          id: p.shop_items.id,
          power_id: itemData.power_id,
          name: itemData.name,
          description: itemData.description,
          duration: itemData.duration,
          delay: itemData.delay
        };
      }) || [];

      setOwnedPowers(powers);
    } catch (error) {
      console.error('Error in fetchOwnedPowers:', error);
    }
  }, [user]);

  // Start game powers - activate powers that should be active at game start
  const startGamePowers = useCallback(() => {
    const gameStartPowers = ownedPowers.filter(power => 
      power.power_id === 'start_shield' || power.power_id === 'ghost_mode'
    ).map(power => ({
      ...power,
      // Override duration for correct behavior
      duration: power.power_id === 'ghost_mode' ? 20000 : undefined
    }));
    
    setActivePowers(gameStartPowers);
    setBookSeenTimes(new Map());
  }, [ownedPowers]);

  // Check if player has start shield power
  const hasStartShield = useCallback(() => {
    return activePowers.some(power => power.power_id === 'start_shield');
  }, [activePowers]);

  // Check if player has book magnet power
  const hasBookMagnet = useCallback(() => {
    return ownedPowers.some(power => power.power_id === 'book_magnet');
  }, [ownedPowers]);

  // Check if player has double points power
  const hasDoublePoints = useCallback(() => {
    return ownedPowers.some(power => power.power_id === 'double_points');
  }, [ownedPowers]);

  // Check if player has ghost mode power (20-second time-based)
  const hasGhostMode = useCallback(() => {
    return activePowers.some(power => power.power_id === 'ghost_mode');
  }, [activePowers]);

  // Check if player has lucky start power
  const hasLuckyStart = useCallback(() => {
    return ownedPowers.some(power => power.power_id === 'lucky_start');
  }, [ownedPowers]);

  // Track when a book is first seen
  const onBookSeen = useCallback((bookId: string) => {
    if (!hasBookMagnet()) return;
    
    setBookSeenTimes(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(bookId)) {
        newMap.set(bookId, Date.now());
        console.log('📚 Book first seen:', bookId, 'at time:', Date.now());
      }
      return newMap;
    });
  }, [hasBookMagnet]);

  // Check if a book should be auto-collected
  const shouldAutoCollectBook = useCallback((bookId: string) => {
    if (!hasBookMagnet()) return false;
    
    const seenTime = bookSeenTimes.get(bookId);
    if (!seenTime) return false;
    
    const magnetPower = ownedPowers.find(p => p.power_id === 'book_magnet');
    const delay = magnetPower?.delay || 1000;
    
    const shouldCollect = Date.now() - seenTime >= delay;
    if (shouldCollect) {
      console.log('🧲 Auto-collecting book:', bookId, 'after delay');
    }
    
    return shouldCollect;
  }, [hasBookMagnet, bookSeenTimes, ownedPowers]);

  // Clear expired powers (like ghost mode after 20 seconds)
  const updateActivePowers = useCallback((gameStartTime: number) => {
    setActivePowers(prev => prev.filter(power => {
      if (power.power_id === 'ghost_mode' && power.duration) {
        return Date.now() - gameStartTime < power.duration;
      }
      // Shield mode stays active until used (one-time use)
      return true;
    }));
  }, []);

  useEffect(() => {
    fetchOwnedPowers();
  }, [fetchOwnedPowers]);

  // Remove shield mode after it's used
  const removeShieldMode = useCallback(() => {
    setActivePowers(prev => prev.filter(power => power.power_id !== 'start_shield'));
  }, []);

  return {
    ownedPowers,
    activePowers,
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
    fetchOwnedPowers
  };
};