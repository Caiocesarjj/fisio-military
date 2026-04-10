import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
      .select("profile_id, email")
      .eq("nip", nip)
      .single();

    if (milError || !militar) {
      return new Response(JSON.stringify({ error: "NIP não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let email: string | null = null;

    // Try via profile_id first
    if (militar.profile_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", militar.profile_id)
        .single();
      email = profile?.email || null;
    }

    // Fallback: use email from militares table directly
    if (!email && militar.email) {
      email = militar.email;
    }

    // Fallback: try generated NIP email
    if (!email) {
      const nipEmail = `${nip}@nip.local`;
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1 });
      // Check if a user exists with this NIP-based email
      const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const found = userList?.users?.find((u: any) => u.email === nipEmail);
      if (found) email = nipEmail;
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "NIP sem usuário vinculado. Peça ao admin para criar seu acesso." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
