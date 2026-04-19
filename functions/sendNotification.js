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
        const RESEND_API_KEY = context.env.RESEND_API_KEY;

        // Check if API key is configured
        if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY environment variable is not set');
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'RESEND_API_KEY not configured' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        for (const police of policeContacts) {
            if (police.email) {
                console.log(`Sending email to ${police.email}...`);
                
                const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Crime Alert System <onboarding@resend.dev>',
                        to: [police.email],
                        subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                        text: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}`
                    })
                });
                
                const responseText = await resendResponse.text();
                
                if (resendResponse.ok) {
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
