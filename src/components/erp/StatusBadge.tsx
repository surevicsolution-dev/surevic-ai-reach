import type { DocStatus } from "@/lib/erp/types";

const MAP: Record<DocStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-info/15 text-info",
  ACCEPTED: "bg-primary/15 text-primary",
  UNPAID: "bg-destructive/12 text-destructive",
  PARTIAL: "bg-warning/20 text-warning-foreground",
  PAID: "bg-success/15 text-success",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${MAP[status]}`}>
      {status}
    </span>
  );
}
