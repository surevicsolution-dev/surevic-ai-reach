import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, FileText, Users, ReceiptIndianRupee, Wallet,
  BookOpenCheck, CalendarClock, Settings, Factory, Plus, ShieldCheck, LogOut, Building2, KeyRound,
  ChevronDown, ClipboardList, ReceiptText, ShoppingCart, Banknote, type LucideIcon,
} from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copilot } from "./Copilot";

type NavItem = { to: string; label: string; icon: LucideIcon };
type NavSection = { label?: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  { items: [{ to: "/", label: "Dashboard", icon: BarChart3 }] },
  {
    label: "Sales",
    items: [
      { to: "/quotations", label: "Quotations", icon: FileText },
      { to: "/sales-orders", label: "Sales Orders", icon: ClipboardList },
      { to: "/proforma-invoices", label: "Proforma Invoices", icon: ReceiptText },
      { to: "/invoices", label: "Tax Invoices", icon: ReceiptIndianRupee },
    ],
  },
  {
    label: "Purchases",
    items: [
      { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { to: "/bills", label: "Bills", icon: Banknote },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/payments", label: "Payments", icon: Wallet },
      { to: "/ledger", label: "Ledgers & Aging", icon: BookOpenCheck },
      { to: "/followups", label: "Follow-ups", icon: CalendarClock },
    ],
  },
  {
    label: "Master Data",
    items: [
      { to: "/parties", label: "Customers & Suppliers", icon: Users },
      { to: "/products", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/audit", label: "Audit Trail", icon: ShieldCheck },
      { to: "/admin/users", label: "Super Admin", icon: KeyRound },
      { to: "/settings", label: "Company & RBAC", icon: Settings },
    ],
  },
];

const ALL_NAV = SECTIONS.flatMap((s) => s.items);

export function Shell({ children }: { children: ReactNode }) {
  const { state, user, companies, companyId, switchCompany, signOut } = useErp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

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
        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {SECTIONS.map((sec) => {
            const containsActive = sec.items.some((n) =>
              n.to === "/" ? pathname === "/" : pathname.startsWith(n.to),
            );
            const open = !sec.label || containsActive || !collapsed.has(sec.label);
            const toggle = (label: string) =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(label)) next.delete(label);
                else next.add(label);
                return next;
              });

            const item = (n: NavItem) => {
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
            };

            const label = sec.label;
            if (!label) return <div key="dashboard" className="space-y-0.5">{sec.items.map(item)}</div>;

            return (
              <div key={label}>
                <button
                  type="button"
                  onClick={() => toggle(label)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50 hover:text-sidebar-foreground"
                >
                  {sec.label}
                  <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
                </button>
                {open && <div className="mt-0.5 space-y-0.5">{sec.items.map(item)}</div>}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
          <p className="font-medium text-sidebar-foreground/90">{state.company.name}</p>
          <p className="tabular">GSTIN {state.company.gstin || "—"}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {ALL_NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)))?.label ?? "Surevic ERP"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              State {state.company.state || "—"} ({state.company.stateCode || "—"}) · Role {state.role} · Alt+N invoice, Alt+Q quotation
            </p>
          </div>

          <Select value={companyId ?? ""} onValueChange={switchCompany}>
            <SelectTrigger className="h-9 w-[190px]">
              <Building2 className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: "invoice" } })}>
            <Plus className="size-4" /> New Invoice
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="size-9 rounded-full p-0 text-[11px] font-semibold">
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                <p className="text-[11px] font-normal text-muted-foreground">
                  {state.company.name} · {state.role}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="size-4" /> Company settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/audit" })}>
                <ShieldCheck className="size-4" /> Audit trail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login", replace: true });
                }}
              >
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">{children}</main>
      </div>

      <Copilot />
    </div>
  );
}
