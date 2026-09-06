import { createFileRoute } from "@tanstack/react-router";
import { DocEditor } from "@/components/erp/DocEditor";
import { kindFromSlug } from "@/lib/erp/doc-kinds";

export const Route = createFileRoute("/_authenticated/doc/new/$kind")({
  head: () => ({
    meta: [
      { title: "New document — Surevic ERP + AI" },
      { name: "description", content: "Create a GST quotation, sales order, proforma, invoice, purchase order or bill with automatic CGST/SGST/IGST." },
      { property: "og:title", content: "New document — Surevic ERP" },
      { property: "og:description", content: "Automatic GST engine, discounts, stock checks and instant totals." },
    ],
  }),
  component: NewDoc,
});

function NewDoc() {
  const { kind } = Route.useParams();
  return <DocEditor kind={kindFromSlug(kind)} />;
}
