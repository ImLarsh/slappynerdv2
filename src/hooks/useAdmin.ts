import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        setIsAdmin(!!data && !error);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const grantBooks = async (targetPlayerName: string, bookAmount: number) => {
    if (!session || !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await supabase.functions.invoke('grant-books', {
        body: { 
          targetPlayerName,
          bookAmount
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { newTotal, targetPlayer } = response.data;
      
      toast({
        title: "Books Granted! 📚",
        description: `Successfully granted ${bookAmount} books to ${targetPlayer}. New total: ${newTotal}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error granting books:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant books. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isAdmin,
    loading,
    grantBooks
  };
};