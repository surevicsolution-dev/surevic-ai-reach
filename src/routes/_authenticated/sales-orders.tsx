import { createFileRoute } from "@tanstack/react-router";
import { DocList } from "@/components/erp/DocList";

export const Route = createFileRoute("/_authenticated/sales-orders")({
  head: () => ({
    meta: [
      { title: "Sales Orders — Surevic ERP + AI" },
      { name: "description", content: "Confirmed customer sales orders with GST line items, ready to convert into tax invoices." },
      { property: "og:title", content: "Sales Orders — Surevic ERP" },
      { property: "og:description", content: "Track SO-00001 style sales orders and convert them to invoices in one click." },
    ],
  }),
  component: () => <DocList kind="SALESORDER" />,
});
