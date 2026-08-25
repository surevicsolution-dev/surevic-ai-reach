import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartyCombobox } from "@/components/erp/PartyCombobox";
import { ItemCombobox } from "@/components/erp/ItemCombobox";
import { Switch } from "@/components/ui/switch";
import { useErp, uid } from "@/lib/erp/store";
import { computeTotals, inr } from "@/lib/erp/gst";
import type { Doc, DocItem, Product } from "@/lib/erp/types";

const today = () => new Date().toISOString().slice(0, 10);

export function DocEditor({ kind, docId }: { kind: Doc["kind"]; docId?: string }) {
  const { state, saveDoc, nextNumber, draft, setDraft } = useErp();
  const navigate = useNavigate();
  const existing = state.docs.find((d) => d.id === docId);

  const [partyId, setPartyId] = useState(existing?.partyId ?? draft?.partyId ?? "");
  const [number, setNumber] = useState(existing?.number ?? nextNumber(kind));
  const [date, setDate] = useState(existing?.date ?? today());
  const [dueDate, setDueDate] = useState(
    existing?.dueDate ?? (kind === "INVOICE" ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : ""),
  );
  const [poRef, setPoRef] = useState(existing?.poRef ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? "");
  const [allowNegative, setAllowNegative] = useState(false);
  const [items, setItems] = useState<DocItem[]>(existing?.items ?? draft?.items ?? []);

  const party = state.parties.find((p) => p.id === partyId);
  const totals = useMemo(() => computeTotals(items, state.company, party), [items, state.company, party]);

  const addProduct = (p: Product) => {
    setItems((it) => [
      ...it,
      { productId: p.id, name: p.name, hsn: p.hsn, qty: 1, rate: p.sellingPrice, taxRate: p.taxRate, unit: p.unit },
    ]);
  };

  const patch = (idx: number, p: Partial<DocItem>) =>
    setItems((it) => it.map((x, i) => (i === idx ? { ...x, ...p } : x)));

  const shortages = items
    .map((i) => {
      const prod = state.products.find((p) => p.id === i.productId);
      const available = (prod?.stock ?? 0) + (existing?.items.find((e) => e.productId === i.productId)?.qty ?? 0);
      return { name: i.name, need: i.qty, available };
    })
    .filter((s) => s.need > s.available);

  const submit = () => {
    if (!partyId) {
      toast.error("Select a party first");
      return;
    }
    if (!items.length) {
      toast.error("Add at least one line item");
      return;
    }
    if (kind === "INVOICE" && shortages.length && !allowNegative) {
      toast.error("Insufficient stock — enable override to proceed");
      return;
    }

    const doc: Doc = {
      id: existing?.id ?? uid("dc"),
      companyId: state.company.id,
      kind,
      number,
      date,
      partyId,
      items,
      status: existing?.status ?? (kind === "INVOICE" ? "UNPAID" : "DRAFT"),
      ...(dueDate ? { dueDate } : {}),
      ...(poRef ? { poRef } : {}),
      ...(notes ? { notes } : {}),
      ...(followUpDate ? { followUpDate } : {}),
    };
    saveDoc(doc);
    setDraft(null);
    toast.success(`${kind === "INVOICE" ? "Tax invoice" : "Quotation"} ${number} saved`);
    navigate({ to: "/doc/$docId", params: { docId: doc.id } });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">{kind === "INVOICE" ? "Tax Invoice" : "Quotation"} details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Party</Label>
              <PartyCombobox value={partyId} onChange={setPartyId} placeholder="Search customer by name, GSTIN, phone…" />
              {party && (
                <div className="mt-2 rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">{party.name}</p>
                  <p>GSTIN {party.gstin || "Unregistered"} · {party.state} ({party.stateCode})</p>
                  {party.billingAddress && <p className="whitespace-pre-line">{party.billingAddress}</p>}
                  {(party.phone || party.email) && <p>{[party.phone, party.email].filter(Boolean).join(" · ")}</p>}
                </div>
              )}
            </div>
            <div><Label>Document No.</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            {kind === "INVOICE" && (
              <>
                <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><Label>Follow-up Date</Label><Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></div>
              </>
            )}
            <div><Label>Customer PO Ref</Label><Input value={poRef} onChange={(e) => setPoRef(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        </section>

        <section className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Line items</h2>
            <ItemCombobox onSelect={addProduct} />
          </div>

          {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No items yet. Add a product above.</p>}

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-md border p-2 sm:grid-cols-[1fr_80px_110px_90px_110px_36px]">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs font-medium">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground">HSN {it.hsn} · {it.unit}</p>
                </div>
                <div><Label className="text-[10px]">Qty</Label><Input className="tabular" type="number" min={1} value={it.qty} onChange={(e) => patch(i, { qty: Number(e.target.value) })} /></div>
                <div><Label className="text-[10px]">Rate</Label><Input className="tabular" type="number" value={it.rate} onChange={(e) => patch(i, { rate: Number(e.target.value) })} /></div>
                <div>
                  <Label className="text-[10px]">GST %</Label>
                  <Select value={String(it.taxRate)} onValueChange={(v) => patch(i, { taxRate: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="tabular pb-2 text-right text-sm font-semibold">{inr(it.qty * it.rate)}</div>
                <Button variant="ghost" size="icon" onClick={() => setItems((x) => x.filter((_, idx) => idx !== i))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold">GST summary</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            {party
              ? totals.interState
                ? `Inter-state supply (${state.company.stateCode} → ${party.stateCode}) · IGST applied`
                : `Intra-state supply (${state.company.stateCode}) · CGST + SGST applied`
              : "Select a party to determine CGST/SGST vs IGST"}
          </p>
          <dl className="space-y-1.5 text-sm">
            <Row label="Taxable value" value={inr(totals.taxable)} />
            {totals.interState ? (
              <Row label="IGST" value={inr(totals.igst)} />
            ) : (
              <>
                <Row label="CGST" value={inr(totals.cgst)} />
                <Row label="SGST" value={inr(totals.sgst)} />
              </>
            )}
            <Row label="Round off" value={inr(totals.roundOff)} />
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
              <span>Grand total</span>
              <span className="tabular">{inr(totals.grandTotal)}</span>
            </div>
          </dl>
        </section>

        {kind === "INVOICE" && shortages.length > 0 && (
          <section className="panel border-destructive/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="size-4" /> Insufficient stock
            </p>
            <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
              {shortages.map((s) => (
                <li key={s.name}>{s.name}: need {s.need}, available {s.available}</li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <Switch checked={allowNegative} onCheckedChange={setAllowNegative} id="ovr" />
              <Label htmlFor="ovr" className="text-xs">Override & allow negative stock</Label>
            </div>
          </section>
        )}

        <Button className="w-full" onClick={submit}>
          <Save className="size-4" /> Save {kind === "INVOICE" ? "invoice" : "quotation"}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate({ to: kind === "INVOICE" ? "/invoices" : "/quotations" })}>
          Cancel
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          <Plus className="mr-1 inline size-3" />Alt+N new invoice · Alt+Q new quotation
        </p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
