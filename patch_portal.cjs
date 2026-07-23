const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

const portalRoute = `
apiRouter.post('/stripe/create-portal-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) return res.status(500).json({ success: false, error: "admin tools not initialized" });
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const profile = userDoc.data();

    // We need to look up the Stripe Customer ID for this user.
    // If we didn't save it on the user profile, we can query Stripe.
    // However, we didn't save stripeCustomerId!
    // We can search Stripe customers by email.
    if (!profile.email) return res.status(400).json({ success: false, error: 'User email not found' });

    const customers = await stripe.customers.search({
      query: \`email:"\${profile.email}"\`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ success: false, error: 'Stripe customer not found' });
    }

    const customerId = customers.data[0].id;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: \`\${req.headers.origin || (req.protocol + '://' + req.get('host'))}/shop\`,
    });

    res.json({ success: true, url: portalSession.url });
  } catch (e: any) {
    console.error("Create portal session error:", e.message, e);
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

code = code.replace(
/apiRouter\.post\('\/stripe\/webhook'/g,
portalRoute + "\\napiRouter.post('/stripe/webhook'"
);

fs.writeFileSync('src/apiRouter.ts', code);
