import { createFileRoute } from "@tanstack/react-router";
import { DocEditor } from "@/components/erp/DocEditor";

export const Route = createFileRoute("/_authenticated/_authenticated/doc/new/$kind")({
  head: () => ({
    meta: [
      { title: "New document — Surevic ERP + AI" },
      { name: "description", content: "Create a GST quotation or tax invoice with automatic CGST/SGST/IGST calculation." },
      { property: "og:title", content: "New document — Surevic ERP" },
      { property: "og:description", content: "Automatic GST engine, stock checks and instant totals." },
    ],
  }),
  component: NewDoc,
});

function NewDoc() {
  const { kind } = Route.useParams();
  return <DocEditor kind={kind === "invoice" ? "INVOICE" : "QUOTATION"} />;
}
