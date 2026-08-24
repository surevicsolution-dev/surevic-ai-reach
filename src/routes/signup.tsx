import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/erp/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Surevic ERP + AI" },
      { name: "description", content: "Create your Surevic ERP company workspace with GST invoicing, inventory and role-based access." },
      { property: "og:title", content: "Create account — Surevic ERP + AI" },
      { property: "og:description", content: "Start a secure multi-tenant GST ERP workspace in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
