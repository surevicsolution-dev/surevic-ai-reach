import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useErp } from "@/lib/erp/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Company, Role } from "@/lib/erp/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Company & RBAC — Surevic ERP + AI" },
      { name: "description", content: "Company GSTIN, state code, bank details, invoice prefixes and role-based access matrix." },
      { property: "og:title", content: "Company & RBAC — Surevic ERP" },
      { property: "og:description", content: "Tenant profile, banking details and role permissions in one place." },
    ],
  }),
  component: Settings,
});

const PERMISSIONS: { role: Role; access: string }[] = [
  { role: "ADMIN", access: "Full access — masters, invoicing, payments, ledgers, settings" },
  { role: "SALES", access: "Quotations, invoices, customers, stock view" },
  { role: "ACCOUNTS", access: "Invoices, payments, ledgers, aging, follow-ups" },
  { role: "WAREHOUSE", access: "Inventory, stock adjustments, dispatch view" },
];

function Settings() {
  const { state, updateCompany, reset } = useErp();
  const c = state.company;
  const set = (k: keyof Company, v: string) => updateCompany({ [k]: v } as Partial<Company>);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Company profile (tenant)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Trade name</Label><Input value={c.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Legal name</Label><Input value={c.legalName} onChange={(e) => set("legalName", e.target.value)} /></div>
          <div><Label>GSTIN</Label><Input className="tabular" value={c.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} /></div>
          <div><Label>PAN</Label><Input className="tabular" value={c.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} /></div>
          <div><Label>State</Label><Input value={c.state} onChange={(e) => set("state", e.target.value)} /></div>
          <div><Label>State code</Label><Input className="tabular" value={c.stateCode} onChange={(e) => set("stateCode", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Registered address</Label><Textarea rows={2} value={c.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={c.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={c.email} onChange={(e) => set("email", e.target.value)} /></div>

          <h3 className="sm:col-span-2 mt-2 text-sm font-semibold">Bank & UPI</h3>
          <div><Label>Bank name</Label><Input value={c.bankName} onChange={(e) => set("bankName", e.target.value)} /></div>
          <div><Label>Account no.</Label><Input className="tabular" value={c.accountNo} onChange={(e) => set("accountNo", e.target.value)} /></div>
          <div><Label>IFSC</Label><Input className="tabular" value={c.ifsc} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} /></div>
          <div><Label>UPI ID</Label><Input value={c.upiId} onChange={(e) => set("upiId", e.target.value)} /></div>

          <h3 className="sm:col-span-2 mt-2 text-sm font-semibold">Numbering</h3>
          <div><Label>Invoice prefix</Label><Input value={c.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></div>
          <div><Label>Quotation prefix</Label><Input value={c.quotePrefix} onChange={(e) => set("quotePrefix", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>Terms & conditions (one per line)</Label>
            <Textarea
              rows={5}
              value={c.terms.join("\n")}
              onChange={(e) => updateCompany({ terms: e.target.value.split("\n") })}
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Changes save automatically to this tenant.</p>
      </section>

      <aside className="space-y-4">
        <section className="panel p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Role-based access
          </h2>
          <ul className="space-y-3 text-sm">
            {PERMISSIONS.map((p) => (
              <li key={p.role} className={`rounded-md border p-2 ${state.role === p.role ? "border-primary bg-primary/5" : ""}`}>
                <p className="text-xs font-semibold tracking-wide">{p.role}</p>
                <p className="text-[11px] text-muted-foreground">{p.access}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Active role: <b>{state.role}</b> (switch in the top bar).</p>
        </section>

        <section className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold">Demo data</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Restore seeded parties, SICK/Siemens/Omron inventory, invoices and receipts.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              reset();
              toast.success("Seed data restored");
            }}
          >
            <RotateCcw className="size-4" /> Reset to seed data
          </Button>
        </section>
      </aside>
    </div>
  );
}
