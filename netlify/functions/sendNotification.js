const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { reportId, incidentType, location, priority, description, policeContacts } = JSON.parse(event.body);
        
        console.log(`📋 Sending notifications for report: ${reportId}`);
        console.log(`📊 Report: ${incidentType} at ${location} (${priority} priority)`);
        
        const results = [];
        
        // Get API keys from environment variables (set in Netlify dashboard)
        const PLUNK_API_KEY = process.env.PLUNK_API_KEY;
        const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
        const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;
        
        // Send EMAILS via Plunk to ALL police
        for (const police of policeContacts) {
            if (police.email && PLUNK_API_KEY) {
                try {
                    const emailResponse = await fetch('https://api.useplunk.com/v1/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${PLUNK_API_KEY}`
                        },
                        body: JSON.stringify({
                            to: police.email,
                            subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                            body: `
                                <h3>New ${priority.toUpperCase()} Priority Report</h3>
                                <p><strong>Report ID:</strong> ${reportId}</p>
                                <p><strong>Incident Type:</strong> ${incidentType}</p>
                                <p><strong>Location:</strong> ${location}</p>
                                <p><strong>Description:</strong> ${description || 'No description provided'}</p>
                                <hr>
                                <p>Please login to the police dashboard for more details.</p>
                            `
                        })
                    });
                    
                    const emailResult = await emailResponse.json();
                    console.log(`📧 Email sent to ${police.email}:`, emailResult.success ? 'SUCCESS' : 'FAILED');
                    results.push({ type: 'email', to: police.email, status: emailResult.success ? 'sent' : 'failed' });
                    
                } catch (error) {
                    console.error(`❌ Email failed to ${police.email}:`, error.message);
                    results.push({ type: 'email', to: police.email, status: 'failed', error: error.message });
                }
            }
            
            // Send SMS via TextBee for HIGH PRIORITY only
            if (priority === 'high' && police.phone && TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID) {
                try {
                    const smsResponse = await fetch('https://api.textbee.dev/api/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': TEXTBEE_API_KEY
                        },
                        body: JSON.stringify({
                            to: police.phone,
                            message: `🚨 URGENT: ${incidentType} at ${location}. Report ID: ${reportId.slice(0,8)}. Login to dashboard now.`,
                            device_id: TEXTBEE_DEVICE_ID
                        })
                    });
                    
                    const smsResult = await smsResponse.json();
                    console.log(`📱 SMS sent to ${police.phone}:`, smsResult.success ? 'SUCCESS' : 'FAILED');
                    results.push({ type: 'sms', to: police.phone, status: smsResult.success ? 'sent' : 'failed' });
                    
                } catch (error) {
                    console.error(`❌ SMS failed to ${police.phone}:`, error.message);
                    results.push({ type: 'sms', to: police.phone, status: 'failed', error: error.message });
                }
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                results,
                summary: {
                    emailsSent: results.filter(r => r.type === 'email' && r.status === 'sent').length,
                    smsSent: results.filter(r => r.type === 'sms' && r.status === 'sent').length
                }
            })
        };
        
    } catch (error) {
        console.error('❌ Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            })
        };
    }
};
