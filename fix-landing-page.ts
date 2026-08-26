import fs from 'fs';
let content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');

const oldJoinCode = `
    try {
      const pairId = \`\${camp.id}_\${user.uid}\`;
      await setDoc(doc(db, 'pickemParticipants', pairId), {
        campaignId: camp.id,
        participantId: user.uid,
        joinedAt: Date.now(),
        joinCode: joinCode.trim()
      });
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      setActiveTab('my_picks');
      setJoinCode('');
    } catch (err) {
      console.error(err);
      setJoinError('Failed to join campaign.');
    }`;

const newJoinCode = `
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ campaignId: camp.id, joinCode: joinCode.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      setActiveTab('my_picks');
      setJoinCode('');
    } catch (err: any) {
      console.error(err);
      setJoinError(err.message || 'Failed to join campaign.');
    }`;

const oldJoinPublic = `
    try {
      const pairId = \`\${camp.id}_\${user.uid}\`;
      await setDoc(doc(db, 'pickemParticipants', pairId), {
        campaignId: camp.id,
        participantId: user.uid,
        joinedAt: Date.now()
      });
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      setActiveTab('my_picks');
      setSelectedPublicCamp(null);
    } catch (err) {
      console.error(err);
      alert('Failed to join campaign.');
    }`;

const newJoinPublic = `
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ campaignId: camp.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      setActiveTab('my_picks');
      setSelectedPublicCamp(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to join campaign.');
    }`;

content = content.replace(oldJoinCode, newJoinCode);
content = content.replace(oldJoinPublic, newJoinPublic);

// Update Public Campaigns to show Entry Fee if any
content = content.replace(
  `                  <p className="text-sm text-[#22c55e] font-semibold">{selectedPublicCamp.leagues?.join(', ')} • Week {selectedPublicCamp.currentWeek ?? 1}</p>`,
  `                  <p className="text-sm text-[#22c55e] font-semibold">{selectedPublicCamp.leagues?.join(', ')} • Week {selectedPublicCamp.currentWeek ?? 1} {selectedPublicCamp.entryFee ? \`• \${selectedPublicCamp.entryFee} Links\` : ''}</p>`
);

content = content.replace(
  `<div className="text-sm text-zinc-400 mt-1">
                            {c.leagues ? c.leagues.join(', ') : 'Mixed'}
                          </div>`,
  `<div className="text-sm text-zinc-400 mt-1">
                            {c.leagues ? c.leagues.join(', ') : 'Mixed'}
                            {c.entryFee ? \` • \${c.entryFee} Links Entry\` : ''}
                          </div>`
);

fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);
