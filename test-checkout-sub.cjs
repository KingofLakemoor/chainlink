const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});
async function run() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: 'prod_Ubebt3HfTCfFfc',
            unit_amount: 499,
            recurring: { interval: 'month' }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    });
    console.log("Success:", session.id);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
