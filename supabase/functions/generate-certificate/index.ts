import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateCertificateRequest {
  user_id: string;
  event_id: string;
  team_id?: string;
  type: "participation" | "winner" | "runner_up" | "appreciation" | "volunteer" | "mentor" | "judge";
  recipient_name: string;
  recipient_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      user_id,
      event_id,
      team_id,
      type,
      recipient_name,
      recipient_email,
    }: GenerateCertificateRequest = await req.json();

    // Generate unique certificate ID
    const prefix = "EVTGO";
    const dateStr = new Date().toISOString().slice(2, 7).replace("-", "");
    const uniquePart = crypto.randomUUID().slice(0, 8).toUpperCase();
    const certificateId = `${prefix}-${dateStr}-${uniquePart}`;

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("title, start_date, end_date")
      .eq("id", event_id)
      .single();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const projectId = supabaseUrl.split("//")[1].split(".")[0];
    const verificationUrl = `https://${projectId}.supabase.co/functions/v1/verify-certificate?id=${certificateId}`;

    // Create certificate record
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .insert({
        certificate_id: certificateId,
        user_id,
        event_id,
        team_id: team_id || null,
        type,
        recipient_name,
        recipient_email: recipient_email || null,
        issue_date: new Date().toISOString(),
        verification_url: verificationUrl,
        template_data: {
          event_title: event?.title || "Event",
          event_date: event?.start_date,
          certificate_type: type,
          issued_on: new Date().toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
        is_valid: true,
      })
      .select()
      .single();

    if (certError) throw certError;

    return new Response(
      JSON.stringify({
        success: true,
        certificate_id: certificateId,
        verification_url: verificationUrl,
        certificate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error generating certificate:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
