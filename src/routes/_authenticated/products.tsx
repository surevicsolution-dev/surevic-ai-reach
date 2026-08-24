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
import { inr } from "@/lib/erp/gst";
import type { Product } from "@/lib/erp/types";

export const Route = createFileRoute("/_authenticated/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Inventory — Surevic ERP + AI" },
      { name: "description", content: "Product masters with SKU, brand, HSN, GST rate, live stock and reorder alerts." },
      { property: "og:title", content: "Inventory — Surevic ERP" },
      { property: "og:description", content: "SICK, Siemens and Omron stock with HSN codes and reorder levels." },
    ],
  }),
  component: Products,
});

const blank = (companyId: string): Product => ({
  id: uid("pr"), companyId, name: "", sku: "", brand: "", hsn: "", unit: "NOS",
  costPrice: 0, sellingPrice: 0, taxRate: 18, stock: 0, minQty: 0,
});

function Products() {
  const { state, upsertProduct } = useErp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(blank(state.company.id));
  const set = (k: keyof Product, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DataTable<Product>
      rows={state.products}
      pageSize={10}
      placeholder="Search SKU, name, brand, HSN…"
      search={(p) => `${p.name} ${p.sku} ${p.brand} ${p.hsn}`}
      onRowClick={(p) => {
        setForm(p);
        setOpen(true);
      }}
      toolbar={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setForm(blank(state.company.id))}>
              <Plus className="size-4" /> New item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>Product master</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>SKU / Part no.</Label><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></div>
              <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="SICK / Siemens / Omron" /></div>
              <div><Label>HSN / SAC</Label><Input className="tabular" value={form.hsn} onChange={(e) => set("hsn", e.target.value)} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} /></div>
              <div><Label>Cost price</Label><Input type="number" value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} /></div>
              <div><Label>Selling price</Label><Input type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", Number(e.target.value))} /></div>
              <div>
                <Label>GST rate</Label>
                <Select value={String(form.taxRate)} onValueChange={(v) => set("taxRate", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Current stock</Label><Input type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} /></div>
              <div><Label>Reorder min qty</Label><Input type="number" value={form.minQty} onChange={(e) => set("minQty", Number(e.target.value))} /></div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!form.name) return;
                  upsertProduct(form);
                  setOpen(false);
                  toast.success(`${form.sku || form.name} saved`);
                }}
              >
                Save item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "sku", header: "SKU", render: (p) => <span className="tabular text-xs font-medium">{p.sku}</span> },
        { key: "name", header: "Item", render: (p) => <span className="text-xs">{p.name}</span> },
        { key: "brand", header: "Brand", render: (p) => <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{p.brand}</span> },
        { key: "hsn", header: "HSN", render: (p) => <span className="tabular text-xs">{p.hsn}</span> },
        { key: "gst", header: "GST", render: (p) => <span className="tabular text-xs">{p.taxRate}%</span> },
        { key: "price", header: "Rate", className: "text-right", render: (p) => <span className="tabular text-xs">{inr(p.sellingPrice)}</span> },
        {
          key: "stock", header: "Stock", className: "text-right",
          render: (p) => (
            <span className={`tabular font-semibold ${p.stock <= p.minQty ? "text-destructive" : ""}`}>
              {p.stock} {p.stock <= p.minQty ? "⚠" : ""}
            </span>
          ),
        },
      ]}
    />
  );
}
