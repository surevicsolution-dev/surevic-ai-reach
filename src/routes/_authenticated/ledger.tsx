import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useErp } from "@/lib/erp/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agingBucket, daysOverdue, fmtDate, inr } from "@/lib/erp/gst";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Ledgers & Aging — Surevic ERP + AI" },
      { name: "description", content: "Party-wise running ledger with debit, credit, closing balance and 0-30 / 31-60 / 60+ aging buckets." },
      { property: "og:title", content: "Ledgers & Aging — Surevic ERP" },
      { property: "og:description", content: "Double-entry statement of account with overdue aging analysis." },
    ],
  }),
  component: Ledger,
});

function Ledger() {
  const { state, totalOf, invoiceBalance } = useErp();
  const [partyId, setPartyId] = useState(state.parties[0]?.id ?? "");
  const party = state.parties.find((p) => p.id === partyId);

  const rows = useMemo(() => {
    if (!party) return [];
    const entries: { date: string; particulars: string; debit: number; credit: number }[] = [];
    if (party.openingBalance)
      entries.push({ date: state.docs[0]?.date ?? "", particulars: "Opening balance", debit: party.openingBalance, credit: 0 });
    state.docs
      .filter((d) => d.kind === "INVOICE" && d.partyId === party.id)
      .forEach((d) => entries.push({ date: d.date, particulars: `Tax Invoice ${d.number}`, debit: totalOf(d), credit: 0 }));
    state.payments
      .filter((p) => p.partyId === party.id)
      .forEach((p) =>
        entries.push({
          date: p.date,
          particulars: `Receipt ${p.reference} (${p.mode})`,
          debit: 0,
          credit: p.amount,
        }),
      );
    entries.sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return entries.map((e) => {
      bal += e.debit - e.credit;
      return { ...e, balance: bal };
    });
  }, [party, state.docs, state.payments, totalOf]);

  const buckets = useMemo(() => {
    const b: Record<string, number> = { Current: 0, "0-30": 0, "31-60": 0, "60+": 0 };
    state.docs
      .filter((d) => d.kind === "INVOICE" && d.partyId === partyId)
      .forEach((d) => {
        const bal = invoiceBalance(d);
        if (bal > 0.5) b[agingBucket(daysOverdue(d))] = (b[agingBucket(daysOverdue(d))] ?? 0) + bal;
      });
    return b;
  }, [state.docs, partyId, invoiceBalance]);

  const closing = rows.at(-1)?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <Select value={partyId} onValueChange={setPartyId}>
          <SelectTrigger className="w-[320px]"><SelectValue placeholder="Select party" /></SelectTrigger>
          <SelectContent>{state.parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="ml-auto text-right">
          <p className="text-[11px] uppercase text-muted-foreground">Closing balance</p>
          <p className={`text-xl font-bold tabular ${closing > 0 ? "text-destructive" : "text-success"}`}>{inr(Math.abs(closing))} {closing > 0 ? "Dr" : "Cr"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(buckets).map(([k, v]) => (
          <div key={k} className="panel p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k === "Current" ? "Not due" : `${k} days`}</p>
            <p className="mt-1 text-lg font-bold tabular">{inr(v)}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b px-4 py-2 text-sm font-semibold">Statement of account — {party?.name}</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Date</th>
              <th className="px-2 py-2">Particulars</th>
              <th className="px-2 py-2 text-right">Debit</th>
              <th className="px-2 py-2 text-right">Credit</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.date ? fmtDate(r.date) : "—"}</td>
                <td className="px-2 py-2">{r.particulars}</td>
                <td className="px-2 py-2 text-right tabular">{r.debit ? inr(r.debit) : "—"}</td>
                <td className="px-2 py-2 text-right tabular text-success">{r.credit ? inr(r.credit) : "—"}</td>
                <td className="px-4 py-2 text-right tabular font-semibold">{inr(r.balance)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No ledger entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
