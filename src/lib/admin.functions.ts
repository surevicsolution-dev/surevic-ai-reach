import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertPlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden — super admin access required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface TenantUser {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  memberId: string;
  banned: boolean;
  lastSignInAt: string | null;
}

export interface TenantRow {
  id: string;
  name: string;
  gstin: string;
  state: string;
  isActive: boolean;
  licenseValidUntil: string | null;
  users: TenantUser[];
}

/** Whether the signed-in user is a platform (super) admin, and whether the list is empty. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id", { count: "exact", head: true });
    return { isSuperAdmin: !!data, unclaimed: (count ?? 0) === 0 };
  });

/** Bootstrap: the first signed-in user may claim super admin while the list is empty. */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("Super admin already configured");
    const { error } = await supabaseAdmin.from("platform_admins").insert({ user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantRow[]> => {
    const admin = await assertPlatformAdmin(context);

    const [{ data: companies }, { data: members }, users] = await Promise.all([
      admin.from("companies").select("id, name, gstin, state, is_active, license_valid_until").order("name"),
      admin.from("company_members").select("id, company_id, user_id, role"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const authUsers = new Map(
      (users.data?.users ?? []).map((u) => [
        u.id,
        {
          email: u.email ?? "",
          fullName: (u.user_metadata?.["full_name"] as string) ?? "",
          banned: !!(u as unknown as { banned_until?: string }).banned_until,
          lastSignInAt: u.last_sign_in_at ?? null,
        },
      ]),
    );

    return (companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      gstin: c.gstin ?? "",
      state: c.state ?? "",
      isActive: c.is_active ?? true,
      licenseValidUntil: c.license_valid_until ?? null,
      users: (members ?? [])
        .filter((m) => m.company_id === c.id)
        .map((m) => {
          const u = authUsers.get(m.user_id);
          return {
            memberId: m.id,
            userId: m.user_id,
            role: m.role,
            email: u?.email ?? "—",
            fullName: u?.fullName ?? "",
            banned: u?.banned ?? false,
            lastSignInAt: u?.lastSignInAt ?? null,
          };
        }),
    }));
  });

export const updateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; licenseValidUntil?: string | null; isActive?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertPlatformAdmin(context);
    const patch: { license_valid_until?: string | null; is_active?: boolean } = {};
    if (data.licenseValidUntil !== undefined) patch.license_valid_until = data.licenseValidUntil || null;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const { error } = await admin.from("companies").update(patch).eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: "ADMIN" | "SALES" | "ACCOUNTS" | "WAREHOUSE" }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertPlatformAdmin(context);
    const { error } = await admin.from("company_members").update({ role: data.role }).eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; email?: string; password?: string; banned?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertPlatformAdmin(context);
    const patch: { email?: string; password?: string; ban_duration?: string } = {};
    if (data.email) patch.email = data.email;
    if (data.password) patch.password = data.password;
    if (data.banned !== undefined) patch.ban_duration = data.banned ? "876000h" : "none";
    const { error } = await admin.auth.admin.updateUserById(data.userId, patch);
    if (error) throw new Error(error.message);
    if (data.email) await admin.from("profiles").update({ email: data.email }).eq("id", data.userId);
    return { ok: true };
  });

export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; redirectTo: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertPlatformAdmin(context);
    const { error } = await admin.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirectTo });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
