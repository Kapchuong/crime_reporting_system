// functions/sendNotification.js
export async function onRequest(context) {
  // 1. Only allow POST requests
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { reportId, incidentType, location, priority, description, policeContacts } = await context.request.json();
    const results = [];

    // 2. Loop through all police contacts and send an email
    for (const police of policeContacts) {
      if (police.email) {
        // 3. Use MailChannels API to send a free email
        const emailRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: police.email }] }],
            from: { email: 'security@kiryandongo.go.ug', name: 'Crime Alert System' },
            subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
            content: [{ type: 'text/plain', value: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}` }]
          })
        });
        
        const emailResponse = await fetch(emailRequest);
        if (emailResponse.ok) {
          results.push({ type: 'email', to: police.email, status: 'sent' });
        } else {
          results.push({ type: 'email', to: police.email, status: 'failed' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
