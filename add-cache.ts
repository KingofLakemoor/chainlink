import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf-8');

const targetContent = `apiRouter.get('/charity/progress', async (req, res) => {
  try {
    let raised = 0;
    let goal = 1000;
    try {
      const response = await fetch('http://act.autismcenter.org/goto/ashweaver');
      const html = await response.text();
      const raisedMatch = html.match(/class="amount-raised-value"[^>]*>\\s*\\$?([\\d,.]+)/i);
      const goalMatch = html.match(/class="total-goal-value"[^>]*>\\s*\\$?([\\d,.]+)/i);
      if (raisedMatch) raised = parseFloat(raisedMatch[1].replace(/,/g, ''));
      if (goalMatch) goal = parseFloat(goalMatch[1].replace(/,/g, ''));
    } catch (e) {
      console.error('Failed to scrape charity page', e);
    }

    let pot = 0;
    try {
      const campaignSnap = await adminDb.collection('pickemCampaigns').where('name', '==', 'YES Day Walk for Autism 2026').limit(1).get();
      if (!campaignSnap.empty) {
        const campaignId = campaignSnap.docs[0].id;
        const snapshot = await adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
          // August 31, 2026 midnight AZ time is 2026-08-31T07:00:00Z
          if (joinedAt < new Date('2026-08-31T07:00:00Z')) {
            pot += 15;
          } else {
            pot += 10;
          }
        });
      }
    } catch (e) {
      console.error('Failed to calculate pot', e);
    }
    
    if (pot > 500) pot = 500;

    res.json({ raised, goal, pot, maxPot: 500 });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

const replacementContent = `let cachedProgress = { raised: 0, goal: 1000, pot: 0, maxPot: 500, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

apiRouter.get('/charity/progress', async (req, res) => {
  try {
    if (Date.now() - cachedProgress.timestamp < CACHE_TTL) {
      return res.json({
        raised: cachedProgress.raised,
        goal: cachedProgress.goal,
        pot: cachedProgress.pot,
        maxPot: cachedProgress.maxPot
      });
    }

    let raised = cachedProgress.raised;
    let goal = cachedProgress.goal;
    try {
      const response = await fetch('http://act.autismcenter.org/goto/ashweaver');
      const html = await response.text();
      const raisedMatch = html.match(/class="amount-raised-value"[^>]*>\\s*\\$?([\\d,.]+)/i);
      const goalMatch = html.match(/class="total-goal-value"[^>]*>\\s*\\$?([\\d,.]+)/i);
      if (raisedMatch) raised = parseFloat(raisedMatch[1].replace(/,/g, ''));
      if (goalMatch) goal = parseFloat(goalMatch[1].replace(/,/g, ''));
    } catch (e) {
      console.error('Failed to scrape charity page', e);
    }

    let pot = 0;
    try {
      const campaignSnap = await adminDb.collection('pickemCampaigns').where('name', '==', 'YES Day Walk for Autism 2026').limit(1).get();
      if (!campaignSnap.empty) {
        const campaignId = campaignSnap.docs[0].id;
        const snapshot = await adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          const joinedAt = new Date(data.joinedAt || data.createdAt || Date.now());
          // August 31, 2026 midnight AZ time is 2026-08-31T07:00:00Z
          if (joinedAt < new Date('2026-08-31T07:00:00Z')) {
            pot += 15;
          } else {
            pot += 10;
          }
        });
      }
    } catch (e) {
      console.error('Failed to calculate pot', e);
    }
    
    if (pot > 500) pot = 500;

    cachedProgress = { raised, goal, pot, maxPot: 500, timestamp: Date.now() };
    res.json({ raised, goal, pot, maxPot: 500 });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('src/apiRouter.ts', content);
