import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useErp } from "@/lib/erp/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { daysOverdue, fmtDate, inr } from "@/lib/erp/gst";

export const Route = createFileRoute("/_authenticated/followups")({
  head: () => ({
    meta: [
      { title: "Payment Follow-ups — Surevic ERP + AI" },
      { name: "description", content: "Schedule and track collection follow-ups; see today's receivables due at a glance." },
      { property: "og:title", content: "Payment Follow-ups — Surevic ERP" },
      { property: "og:description", content: "Never miss a collection call with scheduled follow-up tracking." },
    ],
  }),
  component: FollowUps,
});

function FollowUps() {
  const { state, invoiceBalance, saveDoc } = useErp();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const open = state.docs.filter((d) => d.kind === "INVOICE" && invoiceBalance(d) > 0.5);
  const dueToday = open.filter((d) => d.followUpDate && d.followUpDate <= today);
  const upcoming = open.filter((d) => d.followUpDate && d.followUpDate > today);
  const unscheduled = open.filter((d) => !d.followUpDate);

  const Section = ({ title, docs, tone }: { title: string; docs: typeof open; tone?: string }) => (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <CalendarClock className={`size-4 ${tone ?? "text-muted-foreground"}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{docs.length}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="px-4 py-2">
                <button className="font-medium tabular hover:underline" onClick={() => navigate({ to: "/doc/$docId", params: { docId: d.id } })}>
                  {d.number}
                </button>
                <p className="text-xs text-muted-foreground">{state.parties.find((p) => p.id === d.partyId)?.name}</p>
              </td>
              <td className="px-2 py-2 text-xs text-muted-foreground">
                Due {d.dueDate ? fmtDate(d.dueDate) : "—"}
                {daysOverdue(d) > 0 && <span className="ml-1 font-semibold text-destructive">{daysOverdue(d)}d late</span>}
              </td>
              <td className="px-2 py-2"><StatusBadge status={d.status} /></td>
              <td className="px-2 py-2 text-right tabular font-semibold">{inr(invoiceBalance(d))}</td>
              <td className="px-4 py-2 text-right">
                <Input
                  type="date"
                  className="ml-auto h-8 w-[150px]"
                  value={d.followUpDate ?? ""}
                  onChange={(e) => {
                    saveDoc({ ...d, followUpDate: e.target.value });
                    toast.success(`Follow-up set for ${d.number}`);
                  }}
                />
              </td>
            </tr>
          ))}
          {!docs.length && <tr><td className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing here.</td></tr>}
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today's follow-ups</p>
          <p className="text-2xl font-bold tabular">{dueToday.length}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Value to chase</p>
          <p className="text-2xl font-bold tabular text-destructive">
            {inr(dueToday.reduce((a, d) => a + invoiceBalance(d), 0))}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/payments" })}>Record a receipt</Button>
      </div>

      <Section title="Due today / overdue follow-ups" docs={dueToday} tone="text-destructive" />
      <Section title="Upcoming follow-ups" docs={upcoming} tone="text-info" />
      <Section title="Unscheduled open invoices" docs={unscheduled} />
    </div>
  );
}
