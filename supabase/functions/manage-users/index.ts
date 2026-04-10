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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();
    if (!roleCheck) throw new Error("Not authorized");

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role, nip } = payload;
      if (!password || !role) throw new Error("Missing required fields");

      // Use email if provided, otherwise generate one from NIP
      const userEmail = email || (nip ? `${nip}@nip.local` : `${Date.now()}@nip.local`);

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) throw createError;

      const userId = newUser.user.id;

      // Assign role
      await adminClient.from("user_roles").insert({ user_id: userId, role });

      // If military, link to militares by NIP
      if (role === "military" && nip) {
        // Get or create profile
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (profile) {
          await adminClient
            .from("militares")
            .update({ profile_id: profile.id })
            .eq("nip", nip);
        }
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (!user_id) throw new Error("Missing user_id");

      // Unlink militares
      await adminClient.from("militares").update({ profile_id: null }).eq(
        "profile_id",
        (await adminClient.from("profiles").select("id").eq("user_id", user_id).single()).data?.id || ""
      );

      // Delete role, profile, then auth user
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);
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

      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", user_id)
        .single();

      if (profile) {
        await adminClient.from("militares").update({ profile_id: null }).eq("profile_id", profile.id);
        const { error } = await adminClient.from("militares").update({ profile_id: profile.id }).eq("nip", nip);
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

      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
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
