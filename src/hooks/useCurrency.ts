import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCurrency = () => {
  const [books, setBooks] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBooks(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('books')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching books:', error);
        setBooks(0);
      } else {
        setBooks(data?.books || 0);
      }
    } catch (error) {
      console.error('Error in fetchBooks:', error);
      setBooks(0);
    } finally {
      setLoading(false);
    }
  };

  const addBooks = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({ books: books + amount })
        .eq('id', user.id);

      if (error) {
        console.error('Error adding books:', error);
        return false;
      }

      setBooks(prev => prev + amount);
      return true;
    } catch (error) {
      console.error('Error in addBooks:', error);
      return false;
    }
  };

  const spendBooks = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || books < amount) return false;

      const { error } = await supabase
        .from('profiles')
        .update({ books: books - amount })
        .eq('id', user.id);

      if (error) {
        console.error('Error spending books:', error);
        return false;
      }

      setBooks(prev => prev - amount);
      toast({
        title: "Purchase successful!",
        description: `Spent ${amount} books`,
      });
      return true;
    } catch (error) {
      console.error('Error in spendBooks:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchBooks();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchBooks();
      } else if (event === 'SIGNED_OUT') {
        setBooks(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    books,
    loading,
    addBooks,
    spendBooks,
    refetch: fetchBooks
  };
};