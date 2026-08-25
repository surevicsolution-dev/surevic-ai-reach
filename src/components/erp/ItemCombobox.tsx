import { useMemo, useState } from "react";
import { ChevronsUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/erp/gst";
import { useErp, uid } from "@/lib/erp/store";
import type { Product } from "@/lib/erp/types";

export function ItemCombobox({
  onSelect,
  placeholder = "+ Add product / service",
  className,
}: {
  onSelect: (p: Product) => void;
  placeholder?: string;
  className?: string;
}) {
  const { state, upsertProduct } = useErp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.products;
    if (!q) return list.slice(0, 50);
    return list
      .filter((p) => [p.name, p.sku, p.brand, p.hsn].join(" ").toLowerCase().includes(q))
      .slice(0, 50);
  }, [state.products, query]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className={cn("w-[280px] justify-between font-normal", className)}>
            <span className="truncate text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(620px,92vw)] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b px-2">
              <Search className="size-4 shrink-0 opacity-50" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Item name, part no / SKU, brand or HSN…"
                className="border-0 focus:ring-0"
              />
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => { setOpen(false); setAddOpen(true); }}>
                <Plus className="size-3.5" /> Quick add
              </Button>
            </div>
            <CommandList className="max-h-[340px]">
              <CommandEmpty>
                <div className="space-y-2 py-4 text-center">
                  <p className="text-sm text-muted-foreground">No item matched “{query}”.</p>
                  <Button size="sm" onClick={() => { setOpen(false); setAddOpen(true); }}>
                    <Plus className="size-3.5" /> Quick Add Item
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }}
                    className="gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.sku || "—"} · {p.brand || "—"} · HSN {p.hsn || "—"}
                      </p>
                    </div>
                    <span className={cn("tabular text-[11px]", p.stock <= p.minQty ? "text-destructive" : "text-muted-foreground")}>
                      stock {p.stock} {p.unit}
                    </span>
                    <span className="tabular w-24 text-right text-sm font-semibold">{inr(p.sellingPrice)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddItem
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query}
        companyId={state.company.id}
        onCreate={(p) => {
          upsertProduct(p);
          onSelect(p);
          toast.success(`${p.name} added`);
        }}
      />
    </>
  );
}

function QuickAddItem({
  open,
  onOpenChange,
  initialName,
  companyId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName: string;
  companyId: string;
  onCreate: (p: Product) => void;
}) {
  const [name, setName] = useState(initialName);
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [hsn, setHsn] = useState("");
  const [unit, setUnit] = useState("NOS");
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [stock, setStock] = useState(0);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      id: uid("pr"),
      companyId,
      name: name.trim(),
      sku: sku.trim(),
      brand: brand.trim(),
      hsn: hsn.trim(),
      unit,
      costPrice,
      sellingPrice,
      taxRate,
      stock,
      minQty: 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) setName(initialName); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Quick add item</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Item name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Part no / SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div><Label>Brand</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div><Label>HSN</Label><Input value={hsn} onChange={(e) => setHsn(e.target.value)} /></div>
          <div>
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["NOS", "SET", "MTR", "KG", "BOX", "PKT"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Cost price</Label><Input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} /></div>
          <div><Label>Selling price</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} /></div>
          <div>
            <Label>GST %</Label>
            <Select value={String(taxRate)} onValueChange={(v) => setTaxRate(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Opening stock</Label><Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
