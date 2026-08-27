// Lets a poster edit, delete, or mark their own listing as filled — without
// needing an account. Verified using the edit_token generated at posting
// time (stored only in the poster's browser). Uses the Supabase SERVICE
// ROLE key server-side to bypass RLS after the token check passes.

const { createClient } = require('@supabase/supabase-js')
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EDITABLE_FIELDS = [
  'price',
  'miles',
  'category',
  'vehicle',
  'pickup_city',
  'delivery_city',
  'weight',
  'dimensions',
  'requirements',
  'contact_phone',
  'contact_email',
]

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { postingId, editToken, action, updates } = JSON.parse(event.body)
    if (!postingId || !editToken || !action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'postingId, editToken, and action are required' }) }
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('postings')
      .select('id, edit_token')
      .eq('id', postingId)
      .single()

    if (fetchError || !existing) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Posting not found' }) }
    }
    if (existing.edit_token !== editToken) {
      return { statusCode: 403, body: JSON.stringify({ error: 'That edit link does not match this posting.' }) }
    }

    let result
    if (action === 'mark_filled') {
      result = await supabaseAdmin.from('postings').update({ status: 'filled' }).eq('id', postingId)
    } else if (action === 'delete') {
      // Soft delete — keeps a record instead of destroying it outright
      result = await supabaseAdmin.from('postings').update({ status: 'removed' }).eq('id', postingId)
    } else if (action === 'reactivate') {
      result = await supabaseAdmin.from('postings').update({ status: 'active' }).eq('id', postingId)
    } else if (action === 'update') {
      if (!updates || typeof updates !== 'object') {
        return { statusCode: 400, body: JSON.stringify({ error: 'updates object is required for action=update' }) }
      }
      const safeUpdates = {}
      for (const key of EDITABLE_FIELDS) {
        if (key in updates) safeUpdates[key] = updates[key]
      }
      result = await supabaseAdmin.from('postings').update(safeUpdates).eq('id', postingId)
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) }
    }

    if (result.error) throw result.error
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
