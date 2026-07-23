const Stripe = require('stripe');
const stripe = new Stripe('sk_test_mock'); // Doesn't matter
const priceData = {
  currency: 'usd',
  product: 'prod_123',
  unit_amount: 1000
};
console.log("Checking stripe docs");
