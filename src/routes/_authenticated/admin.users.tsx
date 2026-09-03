import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Search, KeyRound, Mail, Ban, CheckCircle2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  claimSuperAdmin, getAdminStatus, listTenants, sendPasswordResetEmail,
  updateLicense, updateMemberRole, updateUserAccount, type TenantRow,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Super Admin — Users & Licenses | Surevic ERP" },
      { name: "description", content: "Manage every tenant, user role, account access and license validity across the Surevic ERP platform." },
      { property: "og:title", content: "Super Admin — Users & Licenses" },
      { property: "og:description", content: "Cross-tenant user, role and license administration for Surevic ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

const ROLES = ["ADMIN", "SALES", "ACCOUNTS", "WAREHOUSE"] as const;

function AdminUsers() {
  const status = useServerFn(getAdminStatus);
  const claim = useServerFn(claimSuperAdmin);
  const load = useServerFn(listTenants);
  const setLicense = useServerFn(updateLicense);
  const setRole = useServerFn(updateMemberRole);
  const setAccount = useServerFn(updateUserAccount);
  const sendReset = useServerFn(sendPasswordResetEmail);

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [unclaimed, setUnclaimed] = useState(false);
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [q, setQ] = useState("");
  const [pwUser, setPwUser] = useState<{ userId: string; email: string } | null>(null);
  const [pw, setPw] = useState("");

  const refresh = async () => {
    try {
      setRows(await load({}));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await status({});
        setAllowed(s.isSuperAdmin);
        setUnclaimed(s.unclaimed);
        if (s.isSuperAdmin) await refresh();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!ready) return <div className="grid h-64 place-items-center"><Loader2 className="size-5 animate-spin" /></div>;

  if (!allowed) {
    return (
      <div className="panel mx-auto max-w-md space-y-3 p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Super admin area</h1>
        <p className="text-sm text-muted-foreground">
          {unclaimed
            ? "No platform super admin has been configured yet. Claim it with your current account."
            : "Your account does not have platform super admin access."}
        </p>
        {unclaimed && (
          <Button onClick={() => act(async () => { await claim({}); setAllowed(true); }, "You are now the platform super admin")}>
            Claim super admin access
          </Button>
        )}
      </div>
    );
  }

  const filter = q.trim().toLowerCase();
  const visible = rows.filter((r) =>
    !filter ||
    [r.name, r.gstin, r.state, ...r.users.map((u) => `${u.email} ${u.role} ${u.fullName}`)].join(" ").toLowerCase().includes(filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tenants, users &amp; licenses</h1>
          <p className="text-[11px] text-muted-foreground">{rows.length} companies · {rows.reduce((a, r) => a + r.users.length, 0)} users</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, GSTIN, email…" />
        </div>
      </div>

      {visible.map((c) => {
        const expired = !!c.licenseValidUntil && new Date(c.licenseValidUntil) < new Date();
        return (
          <section key={c.id} className="panel p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  GSTIN {c.gstin || "—"} · {c.state || "—"} ·{" "}
                  <span className={c.isActive ? "text-emerald-600" : "text-destructive"}>
                    {c.isActive ? "Active" : "Suspended"}
                  </span>
                  {expired && <span className="text-destructive"> · License expired</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label className="text-[10px]"><CalendarClock className="mr-1 inline size-3" />License valid till</Label>
                  <Input
                    type="date"
                    className="h-9 w-[160px]"
                    defaultValue={c.licenseValidUntil ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (c.licenseValidUntil ?? "") &&
                      act(() => setLicense({ data: { companyId: c.id, licenseValidUntil: e.target.value } }), "License updated")
                    }
                  />
                </div>
                <Button
                  size="sm"
                  variant={c.isActive ? "outline" : "default"}
                  onClick={() => act(() => setLicense({ data: { companyId: c.id, isActive: !c.isActive } }), c.isActive ? "Tenant suspended" : "Tenant activated")}
                >
                  {c.isActive ? <><Ban className="size-4" /> Suspend</> : <><CheckCircle2 className="size-4" /> Activate</>}
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {c.users.length === 0 && <p className="text-xs text-muted-foreground">No users linked.</p>}
              {c.users.map((u) => (
                <div key={u.memberId} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_150px_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{u.email}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {u.fullName || "—"} · {u.banned ? <span className="text-destructive">Deactivated</span> : "Active"}
                      {u.lastSignInAt ? ` · last login ${new Date(u.lastSignInAt).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  </div>
                  <Select value={u.role} onValueChange={(v) => act(() => setRole({ data: { memberId: u.memberId, role: v as (typeof ROLES)[number] } }), "Role updated")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => act(() => sendReset({ data: { email: u.email, redirectTo: `${window.location.origin}/reset-password` } }), "Reset email sent")}>
                      <Mail className="size-3.5" /> Reset email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setPwUser({ userId: u.userId, email: u.email }); setPw(""); }}>
                      <KeyRound className="size-3.5" /> Set password
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const email = window.prompt("New email for this user", u.email);
                        if (email && email !== u.email) void act(() => setAccount({ data: { userId: u.userId, email } }), "Email updated");
                      }}
                    >
                      Change email
                    </Button>
                    <Button
                      size="sm"
                      variant={u.banned ? "default" : "outline"}
                      onClick={() => act(() => setAccount({ data: { userId: u.userId, banned: !u.banned } }), u.banned ? "User activated" : "User deactivated")}
                    >
                      {u.banned ? "Activate" : "Deactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <Dialog open={!!pwUser} onOpenChange={(v) => !v && setPwUser(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Set password — {pwUser?.email}</DialogTitle></DialogHeader>
          <div>
            <Label>New password</Label>
            <Input type="password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>Cancel</Button>
            <Button
              disabled={pw.length < 6}
              onClick={() => {
                const target = pwUser;
                setPwUser(null);
                if (target) void act(() => setAccount({ data: { userId: target.userId, password: pw } }), "Password updated");
              }}
            >
              Update password
            </Button>
          </DialogFooter>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
