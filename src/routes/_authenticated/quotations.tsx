import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useErp } from "@/lib/erp/store";
import { DataTable } from "@/components/erp/DataTable";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDate, inr } from "@/lib/erp/gst";
import type { Doc } from "@/lib/erp/types";

export const Route = createFileRoute("/_authenticated/_authenticated/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Surevic ERP + AI" },
      { name: "description", content: "Create GST quotations and convert them into tax invoices with a single click." },
      { property: "og:title", content: "Quotations — Surevic ERP" },
      { property: "og:description", content: "Draft, send and convert quotations into GST invoices instantly." },
    ],
  }),
  component: Quotations,
});

function Quotations() {
  const { state, totalOf, convertQuotation } = useErp();
  const navigate = useNavigate();
  const rows = state.docs.filter((d) => d.kind === "QUOTATION");

  return (
    <DataTable<Doc>
      rows={rows}
      pageSize={10}
      placeholder="Search quotation no or party…"
      search={(d) => `${d.number} ${state.parties.find((p) => p.id === d.partyId)?.name ?? ""} ${d.status}`}
      onRowClick={(d) => navigate({ to: "/doc/$docId", params: { docId: d.id } })}
      toolbar={
        <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: "quotation" } })}>
          <Plus className="size-4" /> New quotation
        </Button>
      }
      columns={[
        { key: "no", header: "Quotation", render: (d) => <span className="tabular font-medium">{d.number}</span> },
        { key: "party", header: "Party", render: (d) => state.parties.find((p) => p.id === d.partyId)?.name },
        { key: "date", header: "Date", render: (d) => <span className="text-xs text-muted-foreground">{fmtDate(d.date)}</span> },
        { key: "items", header: "Items", render: (d) => <span className="tabular text-xs">{d.items.length}</span> },
        { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
        { key: "total", header: "Value", className: "text-right", render: (d) => <span className="tabular font-semibold">{inr(totalOf(d))}</span> },
        {
          key: "act", header: "", className: "text-right",
          render: (d) => (
            <Button
              variant="outline"
              size="sm"
              disabled={!!d.convertedTo}
              onClick={(e) => {
                e.stopPropagation();
                const inv = convertQuotation(d.id);
                if (inv) {
                  toast.success(`Converted to ${inv.number}`);
                  navigate({ to: "/doc/$docId", params: { docId: inv.id } });
                }
              }}
            >
              <ArrowRightLeft className="size-3.5" /> {d.convertedTo ? "Converted" : "To invoice"}
            </Button>
          ),
        },
      ]}
    />
  );
}
