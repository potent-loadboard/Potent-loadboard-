// Driver access — $25 one-time lifetime
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.handler = async function(event) {
 if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
 try {
 const { email, name, phone, company } = JSON.parse(event.body);
 if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) }
 const base = 'https://potentloadboard.netlify.app';
 const session = await stripe.checkout.sessions.create({
 payment_method_types: ['card'],
 mode: 'payment',
 customer_email: email,
 line_items: [{ price_data: {
 currency: 'usd',
 unit_amount: 2500,
 product_data: {
 name: 'POTENT Loadboard — Driver Access (Lifetime)',
 description: 'One-time $25. See contact info on every load. No monthly fees. Ever.'
 },
 }, quantity: 1 }],
 metadata: { email, name: name||'', phone: phone||'', company: company||'', type: 'drive success_url: `${base}?driver=success&email=${encodeURIComponent(email)}`,
 cancel_url: `${base}?driver=cancelled`,
 });
 return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.string } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
