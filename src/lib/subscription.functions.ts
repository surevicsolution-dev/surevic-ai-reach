import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "info@surevic.com";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string; claims?: Record<string, unknown> };

const emailOf = (context: Ctx) => String(context.claims?.["email"] ?? "").toLowerCase();

async function assertSuperAdmin(context: Ctx) {
  const { data } = await context.supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data && emailOf(context) !== SUPER_ADMIN_EMAIL) {
    throw new Error("Forbidden — super admin access required");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertCompanyAdmin(context: Ctx, companyId: string) {
  const { data } = await context.supabase
    .from("company_members")
    .select("id, role")
    .eq("company_id", companyId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data || data.role !== "ADMIN") throw new Error("Only a company admin can do this");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Link any pending email invitations to the signed-in account. */
export const claimInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = emailOf(context as Ctx);
    if (!email) return { claimed: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("company_members")
      .update({ user_id: context.userId })
      .is("user_id", null)
      .ilike("email", email)
      .select("id");
    return { claimed: data?.length ?? 0 };
  });

export interface MemberRow {
  id: string;
  userId: string | null;
  email: string;
  role: string;
  pending: boolean;
  createdAt: string;
}

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) => d)
  .handler(async ({ data, context }): Promise<MemberRow[]> => {
    const admin = await assertCompanyAdmin(context as Ctx, data.companyId);
    const { data: rows } = await admin
      .from("company_members")
      .select("id, user_id, email, role, created_at")
      .eq("company_id", data.companyId)
      .order("created_at");
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (rows ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: (m.user_id ? byId.get(m.user_id) : "") || m.email || "—",
      role: m.role,
      pending: !m.user_id,
      createdAt: m.created_at,
    }));
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; email: string; role: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertCompanyAdmin(context as Ctx, data.companyId);
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email address");

    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);

    const { error } = await admin.from("company_members").upsert(
      {
        company_id: data.companyId,
        email,
        role: data.role,
        user_id: existing?.id ?? null,
        invited_by: context.userId,
      },
      { onConflict: "company_id,email" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, alreadyRegistered: !!existing };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; memberId: string; role: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertCompanyAdmin(context as Ctx, data.companyId);
    const { error } = await admin
      .from("company_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; memberId: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertCompanyAdmin(context as Ctx, data.companyId);
    const { error } = await admin
      .from("company_members")
      .delete()
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Submit the ₹1 introductory plan payment for admin approval. */
export const requestActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; paymentReference: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertCompanyAdmin(context as Ctx, data.companyId);
    const { data: company, error } = await admin
      .from("companies")
      .update({
        subscription_status: "pending_approval",
        payment_reference: data.paymentReference,
        subscription_submitted_at: new Date().toISOString(),
      })
      .eq("id", data.companyId)
      .select("name, gstin")
      .single();
    if (error) throw new Error(error.message);

    const apiKey = process.env["RESEND_API_KEY"];
    let emailed = false;
    if (apiKey) {
      const body = [
        "New License Approval Request:",
        `- Company: ${company?.name ?? ""}`,
        `- GSTIN: ${company?.gstin || "—"}`,
        `- Owner Email: ${emailOf(context as Ctx)}`,
        "- Plan: 1 Year Introductory Plan (₹1)",
        `- Payment Reference: ${data.paymentReference || "—"}`,
      ].join("\n");
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Surevic ERP <onboarding@resend.dev>",
            to: [SUPER_ADMIN_EMAIL],
            subject: `License approval request — ${company?.name ?? ""}`,
            text: body,
          }),
        });
        emailed = res.ok;
      } catch {
        emailed = false;
      }
    }
    return { ok: true, emailed };
  });

export interface ApprovalRow {
  id: string;
  name: string;
  gstin: string;
  state: string;
  ownerEmail: string;
  paymentReference: string;
  submittedAt: string | null;
  subscriptionStatus: string;
  planValidUntil: string | null;
}

export const getSuperAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isSuperAdmin: !!data || emailOf(context as Ctx) === SUPER_ADMIN_EMAIL };
  });

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApprovalRow[]> => {
    const admin = await assertSuperAdmin(context as Ctx);
    const { data: rows } = await admin
      .from("companies")
      .select("id, name, gstin, state, payment_reference, subscription_submitted_at, subscription_status, plan_valid_until, created_by")
      .in("subscription_status", ["pending_approval", "active"])
      .order("subscription_submitted_at", { ascending: false });
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (rows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      gstin: c.gstin ?? "",
      state: c.state ?? "",
      ownerEmail: byId.get(c.created_by) ?? "—",
      paymentReference: c.payment_reference ?? "",
      submittedAt: c.subscription_submitted_at,
      subscriptionStatus: c.subscription_status,
      planValidUntil: c.plan_valid_until,
    }));
  });

export const approveLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context as Ctx);
    const until = new Date();
    until.setFullYear(until.getFullYear() + 1);
    const validUntil = until.toISOString().slice(0, 10);
    const { error } = await admin
      .from("companies")
      .update({
        subscription_status: "active",
        plan_valid_until: validUntil,
        license_valid_until: validUntil,
        is_active: true,
      })
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, planValidUntil: validUntil };
  });
