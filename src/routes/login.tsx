import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/erp/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Surevic ERP + AI" },
      { name: "description", content: "Sign in to your Surevic ERP workspace to manage GST invoices, inventory and ledgers." },
      { property: "og:title", content: "Sign in — Surevic ERP + AI" },
      { property: "og:description", content: "Secure multi-tenant access to your company's GST ERP workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
