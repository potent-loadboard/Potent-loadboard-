const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { email } = JSON.parse(event.body);
    if (!email) return { statusCode: 200, body: JSON.stringify({ access: false }) };
    const { data } = await supabase.from('driver_members').select('active').eq('email', email.toLowerCase().trim()).single();
    return { statusCode: 200, body: JSON.stringify({ access: !!(data && data.active) }) };
  } catch { return { statusCode: 200, body: JSON.stringify({ access: false }) }; }
};
