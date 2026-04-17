// functions/sendNotification.js
export async function onRequest(context) {
    // 1. Only allow POST requests
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await context.request.json();
        const { reportId, incidentType, location, priority, description, policeContacts } = body;
        
        const results = [];

        // 2. Loop through all police contacts and send an email
        for (const police of policeContacts) {
            if (police.email) {
                console.log(`Sending email to ${police.email}...`);
                
                // 3. Use MailChannels API to send a free email
                const emailRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: police.email }] }],
                        // *** THIS IS THE IMPORTANT CHANGE ***
                        from: { email: 'gatkhor2019@gmail.com', name: 'Crime Alert System' },
                        subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                        content: [{ type: 'text/plain', value: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}` }]
                    })
                });
                
                const emailResponse = await fetch(emailRequest);
                if (emailResponse.ok) {
                    results.push({ type: 'email', to: police.email, status: 'sent' });
                    console.log(`✅ Email sent to ${police.email}`);
                } else {
                    results.push({ type: 'email', to: police.email, status: 'failed' });
                    console.log(`❌ Email failed to ${police.email}`);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Function error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
