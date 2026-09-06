import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Pencil, Printer, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useErp } from "@/lib/erp/store";
import { PrintSheet } from "@/components/erp/PrintSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { inr } from "@/lib/erp/gst";
import { metaOf } from "@/lib/erp/doc-kinds";


export const Route = createFileRoute("/_authenticated/doc/$docId")({
  head: () => ({
    meta: [
      { title: "Document preview — Surevic ERP + AI" },
      { name: "description", content: "Pixel-perfect A4 GST invoice and quotation preview with print and PDF download." },
      { property: "og:title", content: "Document preview — Surevic ERP" },
      { property: "og:description", content: "A4 GST document with bank details, amount in words and signatory block." },
    ],
  }),
  component: DocView,
});

function DocView() {
  const { docId } = Route.useParams();
  const { state, invoiceBalance, convertDoc } = useErp();
  const navigate = useNavigate();
  const doc = state.docs.find((d) => d.id === docId);

  if (!doc) return <p className="text-sm text-muted-foreground">Document not found.</p>;
  const party = state.parties.find((p) => p.id === doc.partyId);
  const meta = metaOf(doc.kind);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: meta.listPath as "/invoices" })}>
          <ArrowLeft className="size-4" /> Back to {meta.plural.toLowerCase()}
        </Button>
        <StatusBadge status={doc.status} />
        {(doc.kind === "INVOICE" || doc.kind === "BILL") && (
          <span className="text-xs text-muted-foreground">Balance due: <b className="tabular">{inr(Math.max(0, invoiceBalance(doc)))}</b></span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {meta.convertTo && !doc.convertedTo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = convertDoc(doc.id);
                if (next) {
                  toast.success(`Converted to ${next.number}`);
                  navigate({ to: "/doc/$docId", params: { docId: next.id } });
                }
              }}
            >
              <ArrowRightLeft className="size-4" /> {meta.convertLabel}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/doc/edit/$docId", params: { docId: doc.id } })}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="size-4" /> Save as PDF
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-6">
        <PrintSheet doc={doc} company={state.company} {...(party ? { party } : {})} />
      </div>
    </div>
  );
}
