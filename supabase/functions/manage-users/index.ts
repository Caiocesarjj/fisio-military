import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeNip = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`;
};

const ensureProfile = async (adminClient: ReturnType<typeof createClient>, userId: string, email: string, fullName?: string | null) => {
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfile) return existingProfile;

  const { data: newProfile, error: profileError } = await adminClient
    .from("profiles")
    .insert({
      user_id: userId,
      email,
      full_name: fullName || null,
    })
    .select("id")
    .single();

  if (profileError) throw profileError;
  return newProfile;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Not authenticated");

    const callerId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .single();
    if (!roleCheck) throw new Error("Not authorized");

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role, nip } = payload;
      if (!password || !role) throw new Error("Missing required fields");

      const normalizedNip = nip ? normalizeNip(String(nip)) : null;
      const userEmail = email || (normalizedNip ? `${normalizedNip}@nip.local` : `${Date.now()}@nip.local`);

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) throw createError;

      const userId = newUser.user.id;
      const profile = await ensureProfile(adminClient, userId, userEmail, full_name);
      await adminClient.from("user_roles").insert({ user_id: userId, role });

      if (role === "military" && normalizedNip) {
        if (profile) {
          await adminClient
            .from("militares")
            .update({ profile_id: profile.id })
            .eq("nip", normalizedNip);
        }
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (!user_id) throw new Error("Missing user_id");

      const [{ count: sessionsCount }, { count: plansCount }] = await Promise.all([
        adminClient
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("fisio_id", user_id),
        adminClient
          .from("treatment_plans")
          .select("id", { count: "exact", head: true })
          .eq("fisio_id", user_id),
      ]);

      if ((sessionsCount ?? 0) > 0 || (plansCount ?? 0) > 0) {
        throw new Error("Não é possível excluir este usuário porque ele ainda está vinculado a atendimentos ou planos de tratamento.");
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (profile?.id) {
        const { error: unlinkError } = await adminClient
          .from("militares")
          .update({ profile_id: null })
          .eq("profile_id", profile.id);
        if (unlinkError) throw unlinkError;
      }

      const { error: rolesError } = await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (rolesError) throw rolesError;

      const { error: profileError } = await adminClient.from("profiles").delete().eq("user_id", user_id);
      if (profileError) throw profileError;

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: militares } = await adminClient.from("militares").select("id, nip, nome_guerra, profile_id");
      const { data: profiles } = await adminClient.from("profiles").select("id, user_id, full_name");

      const enriched = users.map((u: any) => {
        const userRole = roles?.find((r: any) => r.user_id === u.id);
        const profile = profiles?.find((p: any) => p.user_id === u.id);
        const militar = profile ? militares?.find((m: any) => m.profile_id === profile.id) : null;
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || u.user_metadata?.full_name || "",
          role: userRole?.role || "sem role",
          created_at: u.created_at,
          militar_nip: militar?.nip || null,
          militar_nome_guerra: militar?.nome_guerra || null,
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;
      if (!user_id || !role) throw new Error("Missing fields");

      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").insert({ user_id, role });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link_nip") {
      const { user_id, nip } = payload;
      if (!user_id || !nip) throw new Error("Missing fields");

      const normalizedNip = normalizeNip(String(nip));

      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(user_id);
      if (userError || !userData?.user?.email) throw new Error("Usuário não encontrado");

      const profile = await ensureProfile(
        adminClient,
        user_id,
        userData.user.email,
        userData.user.user_metadata?.full_name || null
      );

      if (profile) {
        await adminClient.from("militares").update({ profile_id: null }).eq("profile_id", profile.id);
        const { error } = await adminClient.from("militares").update({ profile_id: profile.id }).eq("nip", normalizedNip);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_password") {
      const { user_id, password } = payload;
      if (!user_id || !password) throw new Error("Missing fields");
      if (password.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");

      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password, email_confirm: true });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
