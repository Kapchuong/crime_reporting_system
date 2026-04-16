// Updated.....
console.log('=== STARTING NOTIFICATION FUNCTION ===');
console.log('PLUNK_API_KEY starts with:', process.env.PLUNK_API_KEY ? process.env.PLUNK_API_KEY.substring(0, 5) : 'NOT SET');
console.log('TEXTBEE_API_KEY exists:', !!process.env.TEXTBEE_API_KEY);
console.log('TEXTBEE_DEVICE_ID exists:', !!process.env.TEXTBEE_DEVICE_ID);
import fetch from 'node-fetch';

export async function handler(event) {
    console.log('=== FUNCTION CALLED ===');
    console.log('HTTP Method:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const body = JSON.parse(event.body);
        console.log('Received body:', JSON.stringify(body, null, 2));
        
        const { reportId, incidentType, location, priority, description, policeContacts } = body;
        
        // Log environment variables (check if they exist)
        console.log('PLUNK_API_KEY exists:', !!process.env.PLUNK_API_KEY);
        console.log('TEXTBEE_API_KEY exists:', !!process.env.TEXTBEE_API_KEY);
        console.log('TEXTBEE_DEVICE_ID exists:', !!process.env.TEXTBEE_DEVICE_ID);
        
        const results = [];
        
        const PLUNK_API_KEY = process.env.PLUNK_API_KEY;
        const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
        const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;
        
        // ============ SEND EMAILS via Plunk ============
        for (const police of policeContacts) {
            if (police.email && PLUNK_API_KEY) {
                try {
                    console.log(`Sending email to ${police.email}...`);
                    const emailResponse = await fetch('https://api.useplunk.com/v1/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${PLUNK_API_KEY}`
                        },
                        body: JSON.stringify({
                            to: police.email,
                            subject: `[${priority.toUpperCase()}] New Crime Report: ${incidentType}`,
                            body: `New ${priority} report: ${incidentType} at ${location}\n\nReport ID: ${reportId}\nDescription: ${description || 'No description provided'}`
                        })
                    });
                    
                    const emailResult = await emailResponse.json();
                    console.log(`Email result:`, emailResult);
                    results.push({ type: 'email', to: police.email, status: emailResult.success ? 'sent' : 'failed', response: emailResult });
                    
                } catch (error) {
                    console.error(`Email error:`, error.message);
                    results.push({ type: 'email', to: police.email, status: 'failed', error: error.message });
                }
            }
        }
        
        // ============ SEND SMS via TextBee (HIGH PRIORITY ONLY) ============
        // for (const police of policeContacts) {
        //     if (priority === 'high' && police.phone && TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID) {
        //         try {
        //             console.log(`Sending SMS to ${police.phone}...`);
        //             const smsResponse = await fetch('https://api.textbee.dev/api/send', {
        //                 method: 'POST',
        //                 headers: {
        //                     'Content-Type': 'application/json',
        //                     'X-API-Key': TEXTBEE_API_KEY
        //                 },
        //                 body: JSON.stringify({
        //                     to: police.phone,
        //                     message: `🚨 URGENT: ${incidentType} at ${location}. Report ID: ${reportId.slice(0,8)}. Login to dashboard now.`,
        //                     device_id: TEXTBEE_DEVICE_ID
        //                 })
        //             });
                    
        //             const smsResult = await smsResponse.json();
        //             console.log(`SMS result:`, smsResult);
        //             results.push({ type: 'sms', to: police.phone, status: smsResult.success ? 'sent' : 'failed', response: smsResult });
                    
        //         } catch (error) {
        //             console.error(`SMS error:`, error.message);
        //             results.push({ type: 'sms', to: police.phone, status: 'failed', error: error.message });
        //         }
        //     }
        // }
        
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
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}
