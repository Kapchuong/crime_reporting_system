// functions/sendNotification.js
// Complete function with CORS headers and email fallback (Resend + Brevo)

// Handle CORS preflight requests (OPTIONS method)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://kapchuong.dpdns.org',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Provider 1: Resend
async function sendViaResend(emailData, apiKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    })
  });
  
  if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
  return await response.json();
}

// Provider 2: Brevo
async function sendViaBrevo(emailData, apiKey) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Crime Alert System',
        email: emailData.from
      },
      to: [{ email: emailData.to }],
      subject: emailData.subject,
      htmlContent: emailData.html
    })
  });
  
  if (!response.ok) throw new Error(`Brevo failed: ${response.status}`);
  return await response.json();
}

// Main function for POST requests
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers for response
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://kapchuong.dpdns.org',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Check if API keys exist
  if (!env.RESEND_API_KEY && !env.BREVO_API_KEY) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No email providers configured' 
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
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
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Handle case where policeContacts array is sent
  let recipientEmails = [];
  if (report.policeContacts && Array.isArray(report.policeContacts)) {
    recipientEmails = report.policeContacts
      .filter(contact => contact.email)
      .map(contact => contact.email);
  } else if (report.officerEmail) {
    recipientEmails = [report.officerEmail];
  }
  
  if (recipientEmails.length === 0) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No recipient emails found' 
    }), { 
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  const emailData = {
    to: recipientEmails[0], // Send to first officer (simplified)
    from: 'alerts@kapchuong.dpdns.org',
    subject: `URGENT: ${(report.priority || 'HIGH').toUpperCase()} Priority Crime Report`,
    html: `<h3>New ${report.priority || 'HIGH'} Priority Incident</h3>
           <p><strong>Type:</strong> ${report.incidentType || 'Not specified'}</p>
           <p><strong>Location:</strong> ${report.location || 'Location captured'}</p>
           <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
           <p><strong>Report ID:</strong> ${report.reportId || 'N/A'}</p>
           <hr>
           <p><small>This is an automated alert from the Crime Reporting System.</small></p>
           <p><small>View and manage this report at: https://kapchuong.dpdns.org/police-dashboard.html</small></p>`
  };
  
  // Try Resend first (if API key exists)
  if (env.RESEND_API_KEY) {
    try {
      await sendViaResend(emailData, env.RESEND_API_KEY);
      console.log('✅ Email sent via Resend to:', emailData.to);
      return new Response(JSON.stringify({ 
        success: true, 
        provider: 'resend',
        message: 'Alert sent successfully via Resend'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error('Resend failed:', error.message);
      
      // If Brevo is available, try fallback
      if (env.BREVO_API_KEY) {
        try {
          await sendViaBrevo(emailData, env.BREVO_API_KEY);
          console.log('✅ Email sent via Brevo (fallback) to:', emailData.to);
          return new Response(JSON.stringify({ 
            success: true, 
            provider: 'brevo-fallback',
            message: 'Resend failed, alert sent via Brevo fallback'
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (fallbackError) {
          console.error('Brevo fallback also failed:', fallbackError.message);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Both email providers failed',
            resendError: error.message,
            brevoError: fallbackError.message
          }), { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      // No Brevo fallback available
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Resend failed and no fallback configured'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  // No Resend key, try Brevo only
  if (env.BREVO_API_KEY) {
    try {
      await sendViaBrevo(emailData, env.BREVO_API_KEY);
      console.log('✅ Email sent via Brevo to:', emailData.to);
      return new Response(JSON.stringify({ 
        success: true, 
        provider: 'brevo-only',
        message: 'Alert sent via Brevo'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error('Brevo failed:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Brevo failed'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'No email providers configured' 
  }), { 
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
