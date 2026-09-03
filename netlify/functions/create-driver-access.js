// Driver access — $19.95/month recurring subscription with 10-day free trial
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { email, name, phone, company } = JSON.parse(event.body);
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) };

    const base = 'https://potentloadboard.netlify.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 1995,
          recurring: { interval: 'month' },
          product_data: {
            name: 'POTENT Loadboard — Driver Access',
            description: '$19.95/month. See full contact info on every load. Cancel anytime.',
          },
        },
        quantity: 1,
      }],
      metadata: {
        email,
        name: name || '',
        phone: phone || '',
        company: company || '',
        type: 'driver_subscription',
      },
      subscription_data: {
        trial_period_days: 10,
        metadata: { email, name: name||'', type: 'driver_subscription' },
      },
      success_url: `${base}?driver=success&email=${encodeURIComponent(email)}`,
      cancel_url: `${base}?driver=cancelled`,

    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
