import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nip, password } = await req.json();
    if (!nip || !password) {
      return new Response(JSON.stringify({ error: "NIP e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up militar by NIP
    const { data: militar, error: milError } = await adminClient
      .from("militares")
      .select("profile_id")
      .eq("nip", nip)
      .single();

    if (milError || !militar?.profile_id) {
      return new Response(JSON.stringify({ error: "NIP não encontrado ou sem usuário vinculado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email from profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, email")
      .eq("id", militar.profile_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "Perfil sem email vinculado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email: profile.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
