import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useErp, uid } from "@/lib/erp/store";
import type { Party, PartyType } from "@/lib/erp/types";

export const cityOf = (p: Party) => {
  const parts = (p.billingAddress || "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : (p.state || "");
};

export function PartyCombobox({
  value,
  onChange,
  placeholder = "Search customer by name, GSTIN, phone…",
  className,
  allowQuickAdd = true,
}: {
  value: string;
  onChange: (id: string, party: Party) => void;
  placeholder?: string;
  className?: string;
  allowQuickAdd?: boolean;
}) {
  const { state, upsertParty } = useErp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const selected = state.parties.find((p) => p.id === value);
  const parties = state.parties;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parties.slice(0, 50);
    return parties
      .filter((p) =>
        [p.name, p.gstin, p.phone, p.email, p.state, p.billingAddress].join(" ").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [parties, query]);

  const pick = (p: Party) => {
    onChange(p.id, p);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? `${selected.name} — ${selected.state} (${selected.stateCode})` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(560px,90vw)] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b px-2">
              <Search className="size-4 shrink-0 opacity-50" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Name, contact, GSTIN or phone…"
                className="border-0 focus:ring-0"
              />
              {allowQuickAdd && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => { setOpen(false); setAddOpen(true); }}>
                  <Plus className="size-3.5" /> Quick add
                </Button>
              )}
            </div>
            <CommandList className="max-h-[320px]">
              <CommandEmpty>
                <div className="space-y-2 py-4 text-center">
                  <p className="text-sm text-muted-foreground">No customer matched “{query}”.</p>
                  {allowQuickAdd && (
                    <Button size="sm" onClick={() => { setOpen(false); setAddOpen(true); }}>
                      <Plus className="size-3.5" /> Quick Add Customer
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => pick(p)} className="items-start gap-2">
                    <Check className={cn("mt-1 size-4", p.id === value ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.gstin || "Unregistered"} · {cityOf(p) || "—"} · {p.phone || "no phone"}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground">{p.type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddParty
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query}
        onCreate={(p) => {
          upsertParty(p);
          onChange(p.id, p);
          toast.success(`${p.name} added`);
        }}
        companyId={state.company.id}
      />
    </>
  );
}

function QuickAddParty({
  open,
  onOpenChange,
  initialName,
  onCreate,
  companyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName: string;
  onCreate: (p: Party) => void;
  companyId: string;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<PartyType>("CUSTOMER");
  const [gstin, setGstin] = useState("");
  const [stateName, setStateName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      id: uid("pt"),
      companyId,
      name: name.trim(),
      type,
      gstin: gstin.trim().toUpperCase(),
      pan: gstin.slice(2, 12),
      state: stateName,
      stateCode: stateCode || gstin.slice(0, 2),
      billingAddress,
      shippingAddress: billingAddress,
      phone,
      email,
      creditLimit: 0,
      openingBalance: 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setName(initialName);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Quick add customer</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Company name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PartyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["CUSTOMER", "SUPPLIER", "BOTH"] as PartyType[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value)} /></div>
          <div><Label>State</Label><Input value={stateName} onChange={(e) => setStateName(e.target.value)} /></div>
          <div><Label>State code</Label><Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Billing address</Label><Textarea rows={2} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
