import { createFileRoute } from "@tanstack/react-router";
import { DocEditor } from "@/components/erp/DocEditor";
import { useErp } from "@/lib/erp/store";

export const Route = createFileRoute("/_authenticated/doc/edit/$docId")({
  head: () => ({
    meta: [
      { title: "Edit document — Surevic ERP + AI" },
      { name: "description", content: "Edit a GST quotation or tax invoice; stock and tax totals recalculate automatically." },
      { property: "og:title", content: "Edit document — Surevic ERP" },
      { property: "og:description", content: "Adjust line items with live GST and stock recalculation." },
    ],
  }),
  component: EditDoc,
});

function EditDoc() {
  const { docId } = Route.useParams();
  const { state } = useErp();
  const doc = state.docs.find((d) => d.id === docId);
  if (!doc) return <p className="text-sm text-muted-foreground">Document not found.</p>;
  return <DocEditor kind={doc.kind} docId={doc.id} />;
}
