import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeNip = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`;
};

const ensureProfileAndLink = async (
  adminClient: ReturnType<typeof createClient>,
  militar: { profile_id?: string | null; email?: string | null; nip: string },
  email: string
) => {
  const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const authUser = userList?.users?.find((user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } }) => user.email === email);

  if (!authUser) return;

  let profileId = militar.profile_id || null;

  if (!profileId) {
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existingProfile?.id) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileError } = await adminClient
        .from("profiles")
        .insert({
          user_id: authUser.id,
          email,
          full_name: authUser.user_metadata?.full_name || null,
        })
        .select("id")
        .single();

      if (profileError) throw profileError;
      profileId = newProfile.id;
    }
  }

  if (profileId) {
    await adminClient.from("militares").update({ profile_id: profileId }).in("nip", [militar.nip, normalizeNip(militar.nip) || militar.nip]);
  }
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

    const rawNip = String(nip).trim();
    const normalizedNip = normalizeNip(rawNip);

    if (!normalizedNip) {
      return new Response(JSON.stringify({ error: "NIP inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateNips = Array.from(new Set([rawNip, normalizedNip]));
    const candidateEmails = Array.from(new Set([`${rawNip}@nip.local`, `${normalizedNip}@nip.local`]));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: militar, error: milError } = await adminClient
      .from("militares")
      .select("profile_id, email")
      .in("nip", candidateNips)
      .maybeSingle();

    if (milError || !militar) {
      return new Response(JSON.stringify({ error: "NIP não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let email: string | null = null;

    if (militar.profile_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", militar.profile_id)
        .maybeSingle();
      email = profile?.email || null;
    }

    if (!email && militar.email) {
      email = militar.email;
    }

    if (!email) {
      const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const found = userList?.users?.find((user: { email?: string | null }) =>
        user.email ? candidateEmails.includes(user.email) : false
      );
      email = found?.email || null;
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "NIP sem usuário vinculado. Peça ao admin para criar seu acesso." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureProfileAndLink(adminClient, { ...militar, nip: normalizedNip }, email);

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
