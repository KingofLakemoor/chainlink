const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
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
            product: 'prod_UbeZGEJ7qNYzqh',
            unit_amount: 525,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    });
    console.log("Success:", session.id);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
