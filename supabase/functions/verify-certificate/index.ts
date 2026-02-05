import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const certificateId = url.searchParams.get("id");

    if (!certificateId) {
      return new Response(
        JSON.stringify({ error: "Certificate ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch certificate
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select(`
        *,
        event:events(title, start_date, end_date)
      `)
      .eq("certificate_id", certificateId)
      .single();

    if (error || !certificate) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Certificate not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = {
      valid: certificate.is_valid,
      certificate_id: certificate.certificate_id,
      recipient_name: certificate.recipient_name,
      type: certificate.type,
      event_title: certificate.event?.title,
      event_date: certificate.event?.start_date,
      issue_date: certificate.issue_date,
      message: certificate.is_valid
        ? "This certificate is valid and verified."
        : "This certificate has been revoked.",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error verifying certificate:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
