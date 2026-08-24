import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErpProvider, useErp } from "@/lib/erp/store";
import { Shell } from "@/components/erp/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: () => (
    <ErpProvider>
      <TenantGate />
    </ErpProvider>
  ),
});

function TenantGate() {
  const { loading, companies, companyId } = useErp();

  if (!companies.length && !loading) return <Onboarding />;
  if (loading && !companyId) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function Onboarding() {
  const { createCompany, user } = useErp();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <div className="panel w-full max-w-md space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold">Create your company</h1>
            <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div><Label>Company name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Surevic Automation Pvt. Ltd." /></div>
          <div><Label>GSTIN</Label><Input className="tabular" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
            <div><Label>State code</Label><Input className="tabular" value={stateCode} onChange={(e) => setStateCode(e.target.value)} /></div>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await createCompany(name.trim(), { gstin, state, stateCode, legalName: name.trim() });
            setBusy(false);
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create company workspace
        </Button>
        <p className="text-[11px] text-muted-foreground">
          You become the ADMIN of this tenant. Load sample data later from Settings → Danger Zone.
        </p>
      </div>
    </div>
  );
}
