import { createFileRoute } from "@tanstack/react-router";
import { DocList } from "@/components/erp/DocList";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Purchase Bills — Surevic ERP + AI" },
      { name: "description", content: "Vendor purchase bills with GST input credit, payment status and stock inward." },
      { property: "og:title", content: "Purchase Bills — Surevic ERP" },
      { property: "og:description", content: "Record supplier bills, input GST and payables in one register." },
    ],
  }),
  component: () => <DocList kind="BILL" />,
});
