import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IndianRupee, AlertTriangle, FileText, TrendingUp, ArrowUpRight } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useErp } from "@/lib/erp/store";
import { inr, fmtDate, daysOverdue, agingBucket } from "@/lib/erp/gst";
import { StatusBadge } from "@/components/erp/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Surevic ERP + AI" },
      { name: "description", content: "Revenue, receivables, low-stock alerts and active quotations at a glance." },
      { property: "og:title", content: "Surevic ERP Dashboard" },
      { property: "og:description", content: "Live GST revenue, receivables and inventory health for your business." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, totalOf, invoiceBalance, outstandingFor } = useErp();
  const navigate = useNavigate();

  const invoices = state.docs.filter((d) => d.kind === "INVOICE");
  const quotations = state.docs.filter((d) => d.kind === "QUOTATION");
  const monthStart = new Date();
  monthStart.setDate(1);
  const revenue = invoices
    .filter((d) => new Date(d.date) >= monthStart)
    .reduce((a, d) => a + totalOf(d), 0);
  const receivables = invoices.reduce((a, d) => a + Math.max(0, invoiceBalance(d)), 0);
  const lowStock = state.products.filter((p) => p.stock <= p.minQty);
  const activeQuotes = quotations.filter((q) => q.status !== "ACCEPTED");

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    const key = d.toLocaleString("en-IN", { month: "short" });
    const total = invoices
      .filter((x) => new Date(x.date).getMonth() === d.getMonth() && new Date(x.date).getFullYear() === d.getFullYear())
      .reduce((a, x) => a + totalOf(x), 0);
    return { month: key, revenue: Math.round(total) };
  });

  const aging = ["Current", "0-30", "31-60", "60+"].map((bucket) => ({
    name: bucket,
    value: Math.round(
      invoices
        .filter((d) => invoiceBalance(d) > 0.5 && agingBucket(daysOverdue(d)) === bucket)
        .reduce((a, d) => a + invoiceBalance(d), 0),
    ),
  })).filter((x) => x.value > 0);

  const topParties = state.parties
    .map((p) => ({ p, out: outstandingFor(p.id) }))
    .filter((x) => x.out > 0.5)
    .sort((a, b) => b.out - a.out)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={IndianRupee} label="Revenue this month" value={inr(revenue)} hint={`${invoices.length} invoices lifetime`} />
        <Metric icon={TrendingUp} label="Outstanding receivables" value={inr(receivables)} hint="Across all customers" tone="warning" />
        <Metric icon={AlertTriangle} label="Low stock alerts" value={String(lowStock.length)} hint="Items at/below reorder level" tone="destructive" />
        <Metric icon={FileText} label="Active quotations" value={String(activeQuotes.length)} hint="Draft + sent" tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Monthly invoiced value</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Receivables aging</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aging} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {aging.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Legend fontSize={11} />
                <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Recent invoices</h2>
            <Link to="/invoices" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {invoices.slice(0, 6).map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate({ to: "/doc/$docId", params: { docId: d.id } })}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2 font-medium tabular">{d.number}</td>
                  <td className="px-2 py-2 text-muted-foreground">{state.parties.find((p) => p.id === d.partyId)?.name}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{fmtDate(d.date)}</td>
                  <td className="px-2 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-2 text-right font-semibold tabular">{inr(totalOf(d))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Top outstanding parties</h2>
          <ul className="space-y-2 text-sm">
            {topParties.map(({ p, out }) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <span className="tabular font-semibold text-destructive">{inr(out)}</span>
              </li>
            ))}
            {!topParties.length && <li className="text-muted-foreground">All settled 🎉</li>}
          </ul>

          <h2 className="mb-2 mt-5 text-sm font-semibold">Low stock</h2>
          <ul className="space-y-2 text-sm">
            {lowStock.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{p.sku}</span>
                <span className="tabular text-xs font-semibold text-warning-foreground">
                  {p.stock} / min {p.minQty}
                </span>
              </li>
            ))}
            {!lowStock.length && <li className="text-muted-foreground">Inventory healthy.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon, label, value, hint, tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint: string;
  tone?: "primary" | "warning" | "destructive" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/12 text-info",
  } as const;
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`grid size-8 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
