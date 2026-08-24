import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { DataTable } from "@/components/erp/DataTable";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, daysOverdue } from "@/lib/erp/gst";
import type { Doc } from "@/lib/erp/types";

export const Route = createFileRoute("/_authenticated/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Tax Invoices — Surevic ERP + AI" },
      { name: "description", content: "GST tax invoices with CGST/SGST/IGST auto-calculation, payment status and aging." },
      { property: "og:title", content: "Tax Invoices — Surevic ERP" },
      { property: "og:description", content: "Track GST invoices, balances and overdue days in one register." },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const { state, totalOf, invoiceBalance } = useErp();
  const navigate = useNavigate();
  const rows = state.docs.filter((d) => d.kind === "INVOICE");

  return (
    <DataTable<Doc>
      rows={rows}
      pageSize={10}
      placeholder="Search invoice no, party, PO ref…"
      search={(d) => `${d.number} ${d.poRef ?? ""} ${state.parties.find((p) => p.id === d.partyId)?.name ?? ""} ${d.status}`}
      onRowClick={(d) => navigate({ to: "/doc/$docId", params: { docId: d.id } })}
      toolbar={
        <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: "invoice" } })}>
          <Plus className="size-4" /> New invoice
        </Button>
      }
      columns={[
        { key: "no", header: "Invoice", render: (d) => <span className="tabular font-medium">{d.number}</span> },
        { key: "party", header: "Party", render: (d) => state.parties.find((p) => p.id === d.partyId)?.name },
        { key: "date", header: "Date", render: (d) => <span className="text-xs text-muted-foreground">{fmtDate(d.date)}</span> },
        {
          key: "due", header: "Due",
          render: (d) => {
            const od = daysOverdue(d);
            return (
              <span className={`text-xs ${od > 0 && invoiceBalance(d) > 0.5 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                {d.dueDate ? fmtDate(d.dueDate) : "—"}{od > 0 && invoiceBalance(d) > 0.5 ? ` · ${od}d late` : ""}
              </span>
            );
          },
        },
        { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
        { key: "total", header: "Total", className: "text-right", render: (d) => <span className="tabular">{inr(totalOf(d))}</span> },
        {
          key: "bal", header: "Balance", className: "text-right",
          render: (d) => <span className="tabular font-semibold">{inr(Math.max(0, invoiceBalance(d)))}</span>,
        },
      ]}
    />
  );
}
