import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function MonthlyRolloverPage() {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleRollover = async () => {
    if (!window.confirm("Are you sure you want to run the monthly rollover? This should only be done ONCE at the end of the month. It will reset chains and calculate monthly winners.")) {
      return;
    }

    setLoading(true);
    try {
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/admin/monthly-rollover', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to run rollover');
      }
      
      addToast({ title: "Success", body: "Monthly rollover completed successfully" });
    } catch (err: any) {
      console.error(err);
      addToast({ title: "Error", body: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-zinc-100">Monthly Rollover</h1>
        <p className="text-zinc-400 mt-1">Manage the end of month transition.</p>
      </div>

      <Card className="border-red-900/30 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            End of Month Rollover
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-300">
            Running the monthly rollover will:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li>Calculate the top players for the month (Best Chain, Most Wins, Best Win Rate)</li>
            <li>Send a global notification with the monthly winners</li>
            <li>Archive all users' current month stats into their historical records</li>
            <li>Reset all users' current month wins, losses, and pushes to 0</li>
            <li>Reset all users' active chains to 0</li>
          </ul>
          
          <div className="pt-4 border-t border-red-900/30">
            <Button 
              onClick={handleRollover} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? "Processing..." : "Run Monthly Rollover"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
