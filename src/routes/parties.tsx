import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useErp, uid } from "@/lib/erp/store";
import { DataTable } from "@/components/erp/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/lib/erp/gst";
import type { Party, PartyType } from "@/lib/erp/types";

export const Route = createFileRoute("/parties")({
  head: () => ({
    meta: [
      { title: "Customers & Suppliers — Surevic ERP + AI" },
      { name: "description", content: "Master data for customers and suppliers with GSTIN, state code, credit limits and balances." },
      { property: "og:title", content: "Customers & Suppliers — Surevic ERP" },
      { property: "og:description", content: "GSTIN-aware party masters powering the automatic GST engine." },
    ],
  }),
  component: Parties,
});

const blank = (companyId: string): Party => ({
  id: uid("pt"), companyId, name: "", type: "CUSTOMER", gstin: "", pan: "", state: "Maharashtra", stateCode: "27",
  billingAddress: "", shippingAddress: "", phone: "", email: "", creditLimit: 0, openingBalance: 0,
});

function Parties() {
  const { state, upsertParty, outstandingFor } = useErp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Party>(blank(state.company.id));

  const edit = (p: Party) => {
    setForm(p);
    setOpen(true);
  };
  const set = (k: keyof Party, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <DataTable<Party>
        rows={state.parties}
        pageSize={8}
        placeholder="Search name, GSTIN, state…"
        search={(p) => `${p.name} ${p.gstin} ${p.state} ${p.type}`}
        onRowClick={edit}
        toolbar={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setForm(blank(state.company.id))}>
                <Plus className="size-4" /> New party
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>Party master</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as PartyType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["CUSTOMER", "SUPPLIER", "BOTH"] as PartyType[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" /></div>
                <div><Label>PAN</Label><Input value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
                <div><Label>State code</Label><Input className="tabular" value={form.stateCode} onChange={(e) => set("stateCode", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Email</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Billing address</Label><Textarea rows={2} value={form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Shipping address</Label><Textarea rows={2} value={form.shippingAddress} onChange={(e) => set("shippingAddress", e.target.value)} /></div>
                <div><Label>Credit limit</Label><Input type="number" value={form.creditLimit} onChange={(e) => set("creditLimit", Number(e.target.value))} /></div>
                <div><Label>Opening balance</Label><Input type="number" value={form.openingBalance} onChange={(e) => set("openingBalance", Number(e.target.value))} /></div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!form.name) return;
                    upsertParty(form);
                    setOpen(false);
                    toast.success(`${form.name} saved`);
                  }}
                >
                  Save party
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        columns={[
          { key: "name", header: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
          { key: "type", header: "Type", render: (p) => <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{p.type}</span> },
          { key: "gstin", header: "GSTIN", render: (p) => <span className="tabular text-xs">{p.gstin}</span> },
          { key: "state", header: "State", render: (p) => <span className="text-xs text-muted-foreground">{p.state} ({p.stateCode})</span> },
          { key: "credit", header: "Credit limit", className: "text-right", render: (p) => <span className="tabular text-xs">{inr(p.creditLimit)}</span> },
          {
            key: "out", header: "Outstanding", className: "text-right",
            render: (p) => {
              const o = outstandingFor(p.id);
              return <span className={`tabular font-semibold ${o > 0.5 ? "text-destructive" : "text-muted-foreground"}`}>{inr(o)}</span>;
            },
          },
        ]}
      />
    </>
  );
}
