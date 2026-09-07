import { createFileRoute, Outlet, redirect, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErpProvider, useErp } from "@/lib/erp/store";
import { Shell } from "@/components/erp/Shell";

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

const BARE = ["/onboarding", "/select-organization"];

function Spinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function TenantGate() {
  const { loading, companies, companyId, hasSelection } = useErp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = BARE.includes(pathname);

  useEffect(() => {
    if (loading || bare) return;
    if (!companies.length) navigate({ to: "/onboarding" });
    else if (!companyId || !hasSelection) navigate({ to: "/select-organization" });
  }, [loading, bare, companies.length, companyId, hasSelection, navigate]);

  if (bare) return <Outlet />;
  if (loading || !companyId) return <Spinner />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
