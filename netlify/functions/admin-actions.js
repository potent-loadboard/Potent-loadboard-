// Lightweight single-password admin moderation — good enough for one person
// removing spam/abuse, not a full admin-accounts system. The password lives
// only in a server-side env var (ADMIN_SECRET), never in the frontend bundle.

const { createClient } = require('@supabase/supabase-js')
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { password, action, postingId } = JSON.parse(event.body)

    if (!process.env.ADMIN_SECRET || password !== process.env.ADMIN_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Wrong password' }) }
    }

    if (action === 'list_all') {
      const { data, error } = await supabaseAdmin
        .from('postings')
        .select(
          'id, created_at, expires_at, category, vehicle, pickup_city, delivery_city, price, miles, status, paid, poster_name, contact_phone, contact_email'
        )
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return { statusCode: 200, body: JSON.stringify({ postings: data }) }
    }

    if (action === 'remove') {
      if (!postingId) return { statusCode: 400, body: JSON.stringify({ error: 'postingId required' }) }
      const { error } = await supabaseAdmin.from('postings').update({ status: 'removed' }).eq('id', postingId)
      if (error) throw error
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
