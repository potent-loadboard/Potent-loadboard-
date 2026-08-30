// Unlimited posting subscription — $100/month
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
exports.handler = async function(event) {
 if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
 try {
 const { email, name, phone, company } = JSON.parse(event.body);
 if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) }
 const base = 'https://potentloadboard.netlify.app';
 const session = await stripe.checkout.sessions.create({
 payment_method_types: ['card'],
 mode: 'subscription',
 customer_email: email,
 line_items: [{ price_data: {
 currency: 'usd',
 recurring: { interval: 'month' },
 unit_amount: 10000,
 product_data: {
 name: 'POTENT Loadboard — Unlimited Posting',
 description: '$100/month. Post unlimited loads. Cancel anytime.',
 },
 }, quantity: 1 }],
 metadata: { email, name: name||'', phone: phone||'', company: company||'', type: 'poste success_url: `${base}?poster=success&email=${encodeURIComponent(email)}`,
 cancel_url: `${base}?poster=cancelled`,
 });
 return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.string } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
;
