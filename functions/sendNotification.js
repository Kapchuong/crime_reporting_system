// functions/sendNotification.js

export async function onRequest(context) {
    // 1. Only allow POST requests (security check)
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 2. Parse the incoming request body from your report-crime.html page
        const requestBody = await context.request.json();
        const { reportId, incidentType, location, priority, description, policeContacts } = requestBody;

        // 3. Get your secret API key from the environment variables you set in Cloudflare
        const RESEND_API_KEY = context.env.RESEND_API_KEY;

        // 4. Check if the API key is configured
        if (!RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY environment variable is not set.");
            return new Response(JSON.stringify({ success: false, error: "Server configuration error." }), { status: 500 });
        }

        const results = [];

        // 5. Loop through all police contacts from your Firestore database
        for (const police of policeContacts) {
            if (police.email) {
                console.log(`📧 Attempting to send email to: ${police.email}`);

                // 6. Prepare the email data to send to Resend's API
                const emailData = {
                    from: 'Crime Alert System <noreply@crime-reporting-system.pages.dev>', // Use your pages.dev domain
                    to: [police.email],
                    subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                    // You can use 'html' for formatted emails, 'text' for plain text.
                    text: `A new ${priority} priority report has been filed.\n\nType: ${incidentType}\nLocation: ${location}\nReport ID: ${reportId}\nDescription: ${description || 'No description provided.'}`
                };

                // 7. Call Resend's official API endpoint
                const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData),
                });

                // 8. Process the response and log the result
                if (resendResponse.ok) {
                    const responseData = await resendResponse.json();
                    console.log(`✅ Email sent to ${police.email}. Resend ID: ${responseData.id}`);
                    results.push({ type: 'email', to: police.email, status: 'sent' });
                } else {
                    const errorText = await resendResponse.text();
                    console.error(`❌ Failed to send email to ${police.email}. Status: ${resendResponse.status}. Error: ${errorText}`);
                    results.push({ type: 'email', to: police.email, status: 'failed' });
                }
            }
        }

        // 9. Send a success response back to your report-crime.html page
        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // 10. Catch any unexpected errors during the process
        console.error('❌ Function error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
