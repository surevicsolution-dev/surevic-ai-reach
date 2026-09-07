import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Plus, LogOut } from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/select-organization")({
  head: () => ({
    meta: [
      { title: "Select an organization — Surevic ERP" },
      { name: "description", content: "Choose which business workspace you want to work in." },
      { property: "og:title", content: "Select an organization — Surevic ERP" },
      { property: "og:description", content: "Choose which business workspace you want to work in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SelectOrganizationPage,
});

export function trialLabel(trialEndsAt?: string) {
  if (!trialEndsAt) return "Pro Plan";
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return "Pro Plan";
  return days > 0 ? `${days} Days Trial` : "Trial ended";
}

function SelectOrganizationPage() {
  const { companies, switchCompany, signOut, user } = useErp();
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Select an organization</h1>
            <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>

        <div className="space-y-2">
          {companies.map((c) => (
            <div key={c.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="tabular text-[11px] text-muted-foreground">GSTIN {c.gstin || "—"}</p>
              </div>
              <Badge variant="secondary">{c.role}</Badge>
              <Badge variant="outline">{trialLabel(c.trialEndsAt)}</Badge>
              <Button
                size="sm"
                onClick={() => { switchCompany(c.id); navigate({ to: "/" }); }}
              >
                Enter Workspace
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/onboarding" })}>
          <Plus className="size-4" /> Add New Organization
        </Button>
      </div>
    </div>
  );
}
