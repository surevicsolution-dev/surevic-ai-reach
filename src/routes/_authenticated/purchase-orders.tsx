import { createFileRoute } from "@tanstack/react-router";
import { DocList } from "@/components/erp/DocList";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — Surevic ERP + AI" },
      { name: "description", content: "Raise vendor purchase orders with GST line items and convert them into purchase bills." },
      { property: "og:title", content: "Purchase Orders — Surevic ERP" },
      { property: "og:description", content: "Vendor selection, discounts, GST and one-click conversion to a bill." },
    ],
  }),
  component: () => <DocList kind="PURCHASEORDER" />,
});
