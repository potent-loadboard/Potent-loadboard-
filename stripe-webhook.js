// Listens for Stripe's checkout.session.completed event and flips the
// matching posting's `paid` field to true in Supabase. This uses the
// Supabase SERVICE ROLE key (server-side only) because it needs to bypass
// the public RLS policies — never expose this key to the browser.

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const postingId = session.metadata?.posting_id

    if (postingId) {
      const { error } = await supabaseAdmin
        .from('postings')
        .update({ paid: true })
        .eq('id', postingId)

      if (error) {
        console.error('Failed to mark posting paid:', error.message)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
