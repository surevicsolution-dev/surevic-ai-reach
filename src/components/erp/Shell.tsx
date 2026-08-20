import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3, Boxes, FileText, Users, ReceiptIndianRupee, Wallet,
  BookOpenCheck, CalendarClock, Settings, Factory, Plus,
} from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/lib/erp/types";
import { Copilot } from "./Copilot";

const NAV = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/invoices", label: "Tax Invoices", icon: ReceiptIndianRupee },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/ledger", label: "Ledgers & Aging", icon: BookOpenCheck },
  { to: "/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/parties", label: "Customers & Suppliers", icon: Users },
  { to: "/products", label: "Inventory", icon: Boxes },
  { to: "/settings", label: "Company & RBAC", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { state, setRole } = useErp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate({ to: "/doc/new/$kind", params: { kind: "invoice" } });
      }
      if (e.altKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        navigate({ to: "/doc/new/$kind", params: { kind: "quotation" } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <span className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Surevic ERP</p>
            <p className="text-[11px] text-sidebar-foreground/60">+ AI Copilot</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
          <p className="font-medium text-sidebar-foreground/90">{state.company.name}</p>
          <p className="tabular">GSTIN {state.company.gstin}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)))?.label ?? "Surevic ERP"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              FY 2026-27 · State {state.company.state} ({state.company.stateCode}) · Alt+N invoice, Alt+Q quotation
            </p>
          </div>
          <Select value={state.role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["ADMIN", "SALES", "ACCOUNTS", "WAREHOUSE"] as Role[]).map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: "invoice" } })}>
            <Plus className="size-4" /> New Invoice
          </Button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">{children}</main>
      </div>

      <Copilot />
    </div>
  );
}
