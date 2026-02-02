import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationEmailRequest {
  email: string;
  fullName: string;
  verifiedBy: string;
  userType: string;
  role?: string;
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

    const { email, fullName, verifiedBy, userType, role }: VerificationEmailRequest = await req.json();

    // Validate required fields
    if (!email || !fullName || !verifiedBy) {
      throw new Error("Missing required fields");
    }

    const roleDisplay = role ? ` (${role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())})` : "";
    const userTypeDisplay = userType === "college" ? "College Staff" : userType.charAt(0).toUpperCase() + userType.slice(1);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EventGo <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Your EventGo Account Has Been Verified!",
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
              <h2 style="color: #1a1f35; margin-bottom: 20px;">Congratulations, ${fullName}! 🎊</h2>
              
              <p>Great news! Your <strong>${userTypeDisplay}${roleDisplay}</strong> account on EventGo has been verified by <strong>${verifiedBy}</strong>.</p>
              
              <p>You now have full access to:</p>
              <ul style="padding-left: 20px;">
                <li>Browse and register for events & hackathons</li>
                ${userType === "college" ? `
                <li>Create and manage college events</li>
                <li>View event registrations and reports</li>
                ${role === "principal" ? "<li>Verify other college staff members</li>" : ""}
                ` : ""}
              </ul>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">If you have any questions, feel free to reach out to our support team.</p>
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

    console.log("Verification email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-verification-email function:", errorMessage);
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
