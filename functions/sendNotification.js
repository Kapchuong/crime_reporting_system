// functions/sendNotification.js - Plunk Version
// Free tier: 3,000 emails/month, no credit card required

// Send email via Plunk API
async function sendViaPlunk(emailData, apiKey) {
  const response = await fetch('https://api.useplunk.com/v1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.html
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Plunk failed (${response.status}): ${errorText}`);
  }
  return await response.json();
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://kapchuong.dpdns.org',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Main function for POST requests
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://kapchuong.dpdns.org',
  };
  
  // Check if API key exists
  if (!env.PLUNK_API_KEY) {
    console.error('No Plunk API key configured');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No Plunk API key configured. Add PLUNK_API_KEY to environment variables.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Parse request body
  let report;
  try {
    report = await request.json();
    console.log('Received notification request for report:', report.reportId);
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request body' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Get recipient email from policeContacts or officerEmail
  let recipientEmail = null;
  if (report.policeContacts && Array.isArray(report.policeContacts)) {
    const policeWithEmail = report.policeContacts.find(contact => contact.email);
    if (policeWithEmail) recipientEmail = policeWithEmail.email;
  } else if (report.officerEmail) {
    recipientEmail = report.officerEmail;
  }
  
  if (!recipientEmail) {
    console.error('No recipient email found in request');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No recipient email found' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Prepare email content
  const priority = report.priority || 'HIGH';
  const emailData = {
    to: recipientEmail,
    subject: `URGENT: ${priority.toUpperCase()} Priority Crime Report - ${report.incidentType || 'Incident'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: ${priority === 'high' ? '#dc3545' : priority === 'medium' ? '#ff9800' : '#4caf50'}; color: white; padding: 10px; text-align: center; border-radius: 5px;">
          <h2 style="margin: 0;">${priority.toUpperCase()} PRIORITY INCIDENT</h2>
        </div>
        
        <div style="padding: 15px;">
          <h3>Incident Details</h3>
          <p><strong>Type:</strong> ${report.incidentType || 'Not specified'}</p>
          <p><strong>Location:</strong> ${report.location || 'Location captured'}</p>
          <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
          <p><strong>Report ID:</strong> ${report.reportId || 'N/A'}</p>
          <hr>
          <p><small>View and manage this report at: <a href="https://kapchuong.dpdns.org/police-dashboard.html">https://kapchuong.dpdns.org/police-dashboard.html</a></small></p>
        </div>
      </div>
    `
  };
  
  // Send email via Plunk
  try {
    const result = await sendViaPlunk(emailData, env.PLUNK_API_KEY);
    console.log('✅ Email sent successfully via Plunk to:', recipientEmail);
    return new Response(JSON.stringify({ 
      success: true, 
      provider: 'plunk',
      message: 'Alert sent successfully',
      messageId: result.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Plunk email failed:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
