export async function onRequest(context) {
    console.log('=== FUNCTION STARTED ===');
    console.log('Request method:', context.request.method);
    
    // Handle preflight CORS
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }
    
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        console.log('Parsing request body...');
        const body = await context.request.json();
        console.log('Body received:', JSON.stringify(body, null, 2));
        
        const { reportId, incidentType, location, priority, description, policeContacts } = body;
        
        console.log(`Processing report ${reportId} for ${policeContacts.length} police contacts`);
        
        const results = [];

        for (const police of policeContacts) {
            if (police.email) {
                console.log(`Sending email to ${police.email}...`);
                try {
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
                    const responseText = await emailResponse.text();
                    console.log(`Email response status: ${emailResponse.status}`);
                    console.log(`Email response body: ${responseText}`);
                    
                    if (emailResponse.ok) {
                        results.push({ type: 'email', to: police.email, status: 'sent' });
                        console.log(`✅ Email sent to ${police.email}`);
                    } else {
                        results.push({ type: 'email', to: police.email, status: 'failed', error: responseText });
                        console.log(`❌ Email failed to ${police.email}: ${responseText}`);
                    }
                } catch (emailError) {
                    console.error(`❌ Email error for ${police.email}:`, emailError.message);
                    results.push({ type: 'email', to: police.email, status: 'failed', error: emailError.message });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ FUNCTION ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}