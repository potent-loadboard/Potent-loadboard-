const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ADMIN_PASSWORD = process.env.LOADBOARD_ADMIN_PASSWORD || 'POTENTBOARD2026';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { password, action, postingId, data } = JSON.parse(event.body);
    if (password !== ADMIN_PASSWORD) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password' }) };

    if (action === 'list_all') {
      const [p, m, d, msg] = await Promise.all([
        supabase.from('postings').select('*').order('created_at', { ascending: false }),
        supabase.from('poster_members').select('*').order('created_at', { ascending: false }),
        supabase.from('driver_members').select('*').order('created_at', { ascending: false }),
        supabase.from('messages').select('*').order('created_at', { ascending: false }),
      ]);
      return { statusCode: 200, body: JSON.stringify({ postings: p.data||[], members: m.data||[], drivers: d.data||[], messages: msg.data||[] }) };
    }
    if (action === 'feature' && postingId) {
      await supabase.from('postings').update({ featured: data?.featured ?? true }).eq('id', postingId);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    if (action === 'remove' && postingId) {
      await supabase.from('postings').update({ status: 'removed' }).eq('id', postingId);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    if (action === 'mark_message_read') {
      await supabase.from('messages').update({ read: true }).eq('id', postingId);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
