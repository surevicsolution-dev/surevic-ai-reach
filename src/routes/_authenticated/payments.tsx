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
import { fmtDate, inr } from "@/lib/erp/gst";
import type { Payment, PaymentMode } from "@/lib/erp/types";

export const Route = createFileRoute("/_authenticated/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Receipts — Surevic ERP + AI" },
      { name: "description", content: "Record receipts against invoices by bank transfer, cheque, UPI or cash with reference numbers." },
      { property: "og:title", content: "Payments & Receipts — Surevic ERP" },
      { property: "og:description", content: "Allocate receipts to invoices and keep balances accurate." },
    ],
  }),
  component: Payments,
});

function Payments() {
  const { state, addPayment, invoiceBalance } = useErp();
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<PaymentMode>("BANK");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const openInvoices = state.docs.filter(
    (d) => d.kind === "INVOICE" && d.partyId === partyId && invoiceBalance(d) > 0.5,
  );

  const save = () => {
    if (!partyId || !amount) {
      toast.error("Party and amount are required");
      return;
    }
    const p: Payment = {
      id: uid("py"), companyId: state.company.id, date, partyId, amount, mode, reference,
      direction: "IN", ...(invoiceId ? { invoiceId } : {}),
    };
    addPayment(p);
    setOpen(false);
    setAmount(0);
    setReference("");
    toast.success(`Receipt of ${inr(p.amount)} recorded`);
  };

  return (
    <DataTable<Payment>
      rows={state.payments}
      pageSize={10}
      placeholder="Search reference, party, mode…"
      search={(p) => `${p.reference} ${p.mode} ${state.parties.find((x) => x.id === p.partyId)?.name ?? ""}`}
      toolbar={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4" /> Record receipt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Payment / receipt entry</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Party</Label>
                <Select value={partyId} onValueChange={(v) => { setPartyId(v); setInvoiceId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                  <SelectContent>{state.parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Against invoice</Label>
                <Select value={invoiceId} onValueChange={(v) => {
                  setInvoiceId(v);
                  const d = state.docs.find((x) => x.id === v);
                  if (d) setAmount(Math.max(0, invoiceBalance(d)));
                }}>
                  <SelectTrigger><SelectValue placeholder={partyId ? "Select invoice" : "Choose party first"} /></SelectTrigger>
                  <SelectContent>
                    {openInvoices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.number} — bal {inr(invoiceBalance(d))}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
                <div>
                  <Label>Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["BANK", "CHEQUE", "UPI", "CASH"] as PaymentMode[]).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Reference no.</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Save receipt</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "date", header: "Date", render: (p) => <span className="text-xs">{fmtDate(p.date)}</span> },
        { key: "party", header: "Party", render: (p) => state.parties.find((x) => x.id === p.partyId)?.name },
        { key: "inv", header: "Invoice", render: (p) => <span className="tabular text-xs">{state.docs.find((d) => d.id === p.invoiceId)?.number ?? "On account"}</span> },
        { key: "mode", header: "Mode", render: (p) => <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{p.mode}</span> },
        { key: "ref", header: "Reference", render: (p) => <span className="tabular text-xs text-muted-foreground">{p.reference}</span> },
        { key: "amt", header: "Amount", className: "text-right", render: (p) => <span className="tabular font-semibold text-success">{inr(p.amount)}</span> },
      ]}
    />
  );
}
