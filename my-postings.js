// Returns full details for postings this browser owns, based on the
// {postingId, editToken} pairs it has stored locally. Verifies each token
// server-side before returning anything, and strips edit_token from the
// response either way.

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
    const { items } = JSON.parse(event.body) // [{ postingId, editToken }, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ postings: [] }) }
    }

    const ids = items.map((i) => i.postingId)
    const { data, error } = await supabaseAdmin.from('postings').select('*').in('id', ids)
    if (error) throw error

    const tokenMap = Object.fromEntries(items.map((i) => [i.postingId, i.editToken]))
    const verified = (data || [])
      .filter((row) => row.edit_token === tokenMap[row.id])
      .map(({ edit_token, ...rest }) => rest)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return { statusCode: 200, body: JSON.stringify({ postings: verified }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
