// Creates a Stripe Checkout session for POTENT's flat $25 posting fee.
// Called by the frontend right after a posting is saved (as unpaid).
// IMPORTANT: this fee is a flat amount, not a % of the shipment value —
// keep it that way. See the Path B revision notes for why that matters.

const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { postingId } = JSON.parse(event.body)
    if (!postingId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'postingId is required' }) }
    }

    const siteUrl = process.env.URL || 'http://localhost:8888'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'POTENT — Load Posting Fee (flat rate)' },
            unit_amount: 2500, // $25.00 — flat, not tied to shipment value
          },
          quantity: 1,
        },
      ],
      metadata: { posting_id: postingId },
      success_url: `${siteUrl}/?posted=success`,
      cancel_url: `${siteUrl}/?posted=cancelled`,
    })

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
