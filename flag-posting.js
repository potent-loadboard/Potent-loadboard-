const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { postingId, reason } = JSON.parse(event.body);
    if (!postingId) return { statusCode: 400, body: JSON.stringify({ error: 'postingId required' }) };
    await supabase.from('flags').insert({ posting_id: postingId, reason: reason||'Inappropriate' });
    // Increment flag count
    await supabase.rpc('increment_flag_count', { posting_id: postingId });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
