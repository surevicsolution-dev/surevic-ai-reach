import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { DataTable } from "@/components/erp/DataTable";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDate, inr } from "@/lib/erp/gst";
import { metaOf } from "@/lib/erp/doc-kinds";
import type { Doc, DocKind } from "@/lib/erp/types";

export function DocList({ kind }: { kind: DocKind }) {
  const { state, totalOf } = useErp();
  const navigate = useNavigate();
  const meta = metaOf(kind);
  const rows = state.docs.filter((d) => d.kind === kind);
  const nameOf = (id: string) => state.parties.find((p) => p.id === id)?.name ?? "—";

  return (
    <DataTable<Doc>
      rows={rows}
      pageSize={10}
      placeholder={`Search ${meta.label.toLowerCase()} no, party, reference…`}
      search={(d) => `${d.number} ${d.poRef ?? ""} ${nameOf(d.partyId ?? "")} ${d.status}`}
      onRowClick={(d) => navigate({ to: "/doc/$docId", params: { docId: d.id } })}
      empty={
        <div className="space-y-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No {meta.plural.toLowerCase()} yet.</p>
          <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: meta.slug } })}>
            <Plus className="size-4" /> Create first {meta.label.toLowerCase()}
          </Button>
        </div>
      }
      toolbar={
        <Button size="sm" onClick={() => navigate({ to: "/doc/new/$kind", params: { kind: meta.slug } })}>
          <Plus className="size-4" /> New {meta.label.toLowerCase()}
        </Button>
      }
      columns={[
        { key: "no", header: meta.label, render: (d) => <span className="tabular font-medium">{d.number}</span> },
        { key: "party", header: meta.partyLabel, render: (d) => nameOf(d.partyId ?? "") },
        { key: "date", header: "Date", render: (d) => <span className="text-xs text-muted-foreground">{fmtDate(d.date)}</span> },
        { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
        { key: "total", header: "Total", className: "text-right", render: (d) => <span className="tabular">{inr(totalOf(d))}</span> },
      ]}
    />
  );
}
