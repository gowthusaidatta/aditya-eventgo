import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RegistrationEmailRequest {
  email: string;
  fullName: string;
  eventTitle: string;
  eventType: string;
  eventDate: string;
  eventLocation?: string;
  rollNumber?: string;
  collegeName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { 
      email, 
      fullName, 
      eventTitle, 
      eventType,
      eventDate,
      eventLocation,
      rollNumber,
      collegeName
    }: RegistrationEmailRequest = await req.json();

    // Validate required fields
    if (!email || !fullName || !eventTitle) {
      throw new Error("Missing required fields");
    }

    const eventTypeDisplay = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    const formattedDate = new Date(eventDate).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EventGo <onboarding@resend.dev>",
        to: [email],
        subject: `✅ Registration Confirmed: ${eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1f35 0%, #0d1117 100%); padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="color: #ff6b35; margin: 0;">EventGo</h1>
              <p style="color: #ffffff; margin-top: 5px;">Your gateway to campus experiences</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <h2 style="color: #1a1f35; margin-bottom: 20px;">Registration Confirmed! 🎉</h2>
              
              <p>Hi <strong>${fullName}</strong>,</p>
              
              <p>Your registration for the following event has been confirmed:</p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #ff6b35; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #1a1f35; margin: 0 0 10px 0;">${eventTitle}</h3>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${eventTypeDisplay}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                ${eventLocation ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>` : ""}
              </div>
              
              <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #2e7d32;">Your Registration Details:</p>
                <p style="margin: 5px 0;">Name: ${fullName}</p>
                ${rollNumber ? `<p style="margin: 5px 0;">Roll Number: ${rollNumber}</p>` : ""}
                ${collegeName ? `<p style="margin: 5px 0;">College: ${collegeName}</p>` : ""}
              </div>
              
              <p>Please keep this email as confirmation. We look forward to seeing you at the event!</p>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you need to cancel your registration, you can do so from your Student Dashboard.
              </p>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 12px;">
              <p>© 2026 EventGo. All rights reserved.</p>
              <p>In collaboration with Aditya University</p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Registration confirmation email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-registration-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
