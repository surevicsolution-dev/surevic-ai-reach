import { createFileRoute } from "@tanstack/react-router";
import { DocList } from "@/components/erp/DocList";

export const Route = createFileRoute("/_authenticated/proforma-invoices")({
  head: () => ({
    meta: [
      { title: "Proforma Invoices — Surevic ERP + AI" },
      { name: "description", content: "Issue proforma invoices for advance payments and convert them into final GST tax invoices." },
      { property: "og:title", content: "Proforma Invoices — Surevic ERP" },
      { property: "og:description", content: "PI-00001 numbering, GST totals and one-click conversion to final invoice." },
    ],
  }),
  component: () => <DocList kind="PROFORMA" />,
});
