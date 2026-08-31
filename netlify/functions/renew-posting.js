const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { postingId, editToken } = JSON.parse(event.body);
    const { data: posting } = await supabase.from('postings').select('id,edit_token').eq('id', postingId).single();
    if (!posting || posting.edit_token !== editToken) return { statusCode: 403, body: JSON.stringify({ error: 'Invalid token' }) };
    const newExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('postings').update({ expires_at: newExpiry, status: 'active' }).eq('id', postingId);
    return { statusCode: 200, body: JSON.stringify({ success: true, expires_at: newExpiry }) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
