// Functon to send notifications to police contacts when a new crime report is created
export async function onRequest(context) {
    console.log('=== FUNCTION STARTED ===');
    
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await context.request.json();
        const { reportId, incidentType, location, priority, description, policeContacts } = body;
        
        console.log(`Processing report ${reportId} for ${policeContacts.length} police contacts`);
        
        const results = [];

        for (const police of policeContacts) {
            if (police.email) {
                console.log(`Sending email to ${police.email}...`);
                
                const emailRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: police.email }] }],
                        from: { email: 'security@kiryandongo.go.ug', name: 'Crime Alert System' },
                        subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                        content: [{ 
                            type: 'text/plain', 
                            value: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}`
                        }]
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