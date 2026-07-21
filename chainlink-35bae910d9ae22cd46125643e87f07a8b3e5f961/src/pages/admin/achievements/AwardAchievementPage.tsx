import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Select } from '../../../components/ui/select';
import { ArrowLeftIcon } from "lucide-react";

export default function AwardAchievementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const achSnap = await getDocs(collection(db, 'achievements'));
        setAchievements(achSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching data", e);
      }
    };
    fetchData();
  }, []);

  const handleAward = async () => {
    if (!selectedUser || !selectedAchievement) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const userRef = doc(db, 'users', selectedUser);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setMessage('User not found');
        return;
      }

      const userData = userSnap.data();
      const currentAchievements = userData.achievements || [];

      // Check if user already has it
      if (currentAchievements.some((a: any) => a.achievementId === selectedAchievement)) {
        setMessage('User already has this achievement');
        return;
      }

      const achievement = achievements.find(a => a.id === selectedAchievement);

      await updateDoc(userRef, {
        achievements: [...currentAchievements, {
          achievementId: selectedAchievement,
          awardedAt: Date.now()
        }],
        links: (userData.links || 0) + (achievement?.links || 0)
      });

      setMessage('Achievement awarded successfully!');
      setSelectedUser('');
      setSelectedAchievement('');
    } catch (e) {
      console.error(e);
      setMessage('Error awarding achievement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="m-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" onClick={() => navigate('/admin/achievements')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-zinc-50">Award Achievement</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {message && (
            <div className={`p-3 rounded-md ${message.includes('success') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {message}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Select User</label>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Select a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username || u.name} ({u.email})</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Select Achievement</label>
            <Select
              value={selectedAchievement}
              onChange={(e) => setSelectedAchievement(e.target.value)}
            >
              <option value="">Select an achievement...</option>
              {achievements.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
              ))}
            </Select>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleAward}
            disabled={!selectedUser || !selectedAchievement || isSubmitting}
          >
            {isSubmitting ? 'Awarding...' : 'Award Achievement'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
