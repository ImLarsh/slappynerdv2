import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAdmin } from '@/hooks/useAdmin';

export const AdminPanel: React.FC = () => {
  const [targetPlayer, setTargetPlayer] = useState('');
  const [bookAmount, setBookAmount] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const { grantBooks } = useAdmin();

  const handleGrantBooks = async () => {
    if (!targetPlayer.trim() || !bookAmount.trim()) {
      return;
    }

    const amount = parseInt(bookAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    setIsGranting(true);
    const success = await grantBooks(targetPlayer.trim(), amount);
    
    if (success) {
      setTargetPlayer('');
      setBookAmount('');
    }
    
    setIsGranting(false);
  };

  return (
    <Card className="p-3 md:p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg md:text-xl font-bold text-primary mb-2">Admin Panel 👨‍💼</h3>
          <p className="text-sm text-muted-foreground">Grant books to players</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="targetPlayer">Player Name</Label>
            <Input
              id="targetPlayer"
              value={targetPlayer}
              onChange={(e) => setTargetPlayer(e.target.value)}
              placeholder="Enter player username"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bookAmount">Book Amount</Label>
            <Input
              id="bookAmount"
              type="number"
              value={bookAmount}
              onChange={(e) => setBookAmount(e.target.value)}
              placeholder="Number of books to grant"
              min="1"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleGrantBooks}
            disabled={!targetPlayer.trim() || !bookAmount.trim() || isGranting}
            className="w-full"
          >
            {isGranting ? 'Granting Books...' : 'Grant Books 📚'}
          </Button>
        </div>
      </div>
    </Card>
  );
};