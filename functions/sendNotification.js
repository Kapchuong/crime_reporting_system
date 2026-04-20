// functions/sendNotification.js
export async function onRequest(context) {
    // Handle CORS preflight request
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    // Only allow POST requests
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await context.request.json();
        const { reportId, incidentType, location, priority, description, policeContacts } = body;
        
        const results = [];
        
        // Get DKIM environment variables (if configured)
        const DKIM_PRIVATE_KEY = context.env.DKIM_PRIVATE_KEY;
        const DKIM_SELECTOR = context.env.DKIM_SELECTOR || 'mailchannels';
        const DOMAIN = context.env.DOMAIN || 'kapchuong.dpdns.org';

        for (const police of policeContacts) {
            if (police.email) {
                console.log(`Sending email to ${police.email}...`);
                
                // Build email payload with optional DKIM signing
                const emailPayload = {
                    personalizations: [{ to: [{ email: police.email }] }],
                    from: { email: `noreply@${DOMAIN}`, name: 'Crime Alert System' },
                    subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                    content: [{ 
                        type: 'text/plain', 
                        value: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}`
                    }]
                };
                
                // Add DKIM signing if private key is available
                if (DKIM_PRIVATE_KEY) {
                    emailPayload.dkim = {
                        privateKey: DKIM_PRIVATE_KEY,
                        selector: DKIM_SELECTOR,
                        domain: DOMAIN
                    };
                }
                
                const emailRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                });
                
                const emailResponse = await fetch(emailRequest);
                const responseText = await emailResponse.text();
                
                if (emailResponse.ok) {
                    results.push({ type: 'email', to: police.email, status: 'sent' });
                    console.log(`✅ Email sent to ${police.email}`);
                } else {
                    console.error(`❌ Email failed to ${police.email}: ${responseText}`);
                    results.push({ type: 'email', to: police.email, status: 'failed', error: responseText });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), { 
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
        
    } catch (error) {
        console.error('Function error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { 
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
