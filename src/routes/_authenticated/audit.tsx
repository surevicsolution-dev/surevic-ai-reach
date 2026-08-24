import { createFileRoute } from "@tanstack/react-router";
import { useErp } from "@/lib/erp/store";
import { DataTable } from "@/components/erp/DataTable";
import type { AuditEntry } from "@/lib/erp/mappers";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — Surevic ERP + AI" },
      { name: "description", content: "Immutable audit trail of who created or edited invoices, quotations, payments and masters." },
      { property: "og:title", content: "Audit Trail — Surevic ERP" },
      { property: "og:description", content: "Timestamped record of every change in your ERP tenant." },
    ],
  }),
  component: Audit,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function Audit() {
  const { audit } = useErp();

  return (
    <DataTable<AuditEntry>
      rows={audit}
      pageSize={12}
      placeholder="Search user, action, entity…"
      empty="No activity recorded for this company yet."
      search={(a) => `${a.userEmail} ${a.action} ${a.entity} ${a.summary}`}
      columns={[
        { key: "when", header: "When", render: (a) => <span className="tabular text-xs text-muted-foreground">{fmt(a.createdAt)}</span> },
        { key: "who", header: "User", render: (a) => <span className="text-xs font-medium">{a.userEmail || "—"}</span> },
        {
          key: "action", header: "Action",
          render: (a) => (
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">{a.action}</span>
          ),
        },
        { key: "entity", header: "Entity", render: (a) => <span className="text-xs">{a.entity}</span> },
        { key: "summary", header: "Details", render: (a) => <span className="text-xs text-muted-foreground">{a.summary}</span> },
      ]}
    />
  );
}
