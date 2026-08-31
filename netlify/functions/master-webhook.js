const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const POTENT_AREA = ['conyers','covington','lithonia','stone mountain','decatur','loganville',
  'social circle','oxford','porterdale','rockdale','newton','snellville','grayson',
  'lawrenceville','mcdonough','stockbridge','ellenwood','rex','jonesboro','morrow',
  'tucker','clarkston','atlanta','east atlanta','college park','hapeville'];

function isPotentMatch(posting) {
  const w = Number((posting.weight||'').replace(/[^0-9.]/g,''));
  const weightOk = !posting.weight || w <= 4300;
  const areaMatch = POTENT_AREA.some(c => (posting.pickup_city||'').toLowerCase().includes(c));
  return weightOk && areaMatch;
}

exports.handler = async function(event) {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) { return { statusCode: 400, body: `Webhook Error: ${e.message}` }; }

  const type = stripeEvent.type;

  // ── Load posting paid ($25/post) ──────────────────────────────
  if (type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const meta = session.metadata || {};

    // Single load post payment
    if (meta.postingId) {
      const { data: posting } = await supabase.from('postings').select('*').eq('id', meta.postingId).single();
      await supabase.from('postings').update({
        paid: true, stripe_session_id: session.id,
        potent_match: posting ? isPotentMatch(posting) : false,
      }).eq('id', meta.postingId);
      console.log('Load posting activated:', meta.postingId);
    }

    // Poster unlimited subscription activated
    if (meta.type === 'poster_subscription') {
      const expires = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('poster_members').upsert({
        email: meta.email.toLowerCase().trim(),
        name: meta.name||'', phone: meta.phone||'', company: meta.company||'',
        stripe_session_id: session.id,
        stripe_subscription_id: session.subscription,
        active: true, expires_at: expires,
      }, { onConflict: 'email' });
      console.log('Poster subscription activated:', meta.email);
    }

    // Driver lifetime access ($25 one-time)
    if (meta.type === 'driver_access') {
      await supabase.from('driver_members').upsert({
        email: meta.email.toLowerCase().trim(),
        name: meta.name||'', phone: meta.phone||'', company: meta.company||'',
        stripe_session_id: session.id, active: true,
      }, { onConflict: 'email' });
      console.log('Driver access activated:', meta.email);
    }
  }

  // ── Poster subscription cancelled/expired ─────────────────────
  if (type === 'customer.subscription.deleted' || type === 'customer.subscription.paused') {
    const sub = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(sub.customer);
    if (customer.email) {
      await supabase.from('poster_members').update({ active: false }).eq('email', customer.email);
      console.log('Poster subscription cancelled:', customer.email);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
