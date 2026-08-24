import { useRef, useState } from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { download } from "@/lib/erp/csv";
import type { ImportResult } from "@/lib/erp/csv";

export function CsvTools<T>({
  label,
  filename,
  exportCsv,
  parse,
  onImport,
  headers,
  disabled,
}: {
  label: string;
  filename: string;
  exportCsv: () => string;
  parse: (text: string) => ImportResult<T>;
  onImport: (rows: T[]) => Promise<void> | void;
  headers: string[];
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ImportResult<T> | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parse(text);
    setReport(result);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => download(filename, exportCsv())}>
        <Download className="size-4" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
        <Upload className="size-4" /> Import CSV
      </Button>

      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Import {label} — validation report</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="rounded-md border bg-muted/40 p-2 text-xs">
              Expected columns: <span className="tabular">{headers.join(", ")}</span>
            </p>
            <p>
              <b className="tabular">{report?.rows.length ?? 0}</b> valid row(s) ready ·{" "}
              <b className="tabular text-destructive">{report?.errors.length ?? 0}</b> rejected
            </p>
            {!!report?.errors.length && (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                {report.errors.map((e, i) => (
                  <p key={i} className="flex gap-2 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>Line {e.line}: {e.message}</span>
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              {!!report?.errors.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    download(
                      `errors-${filename}`,
                      ["line,error", ...(report?.errors ?? []).map((e) => `${e.line},"${e.message.replace(/"/g, '""')}"`)].join("\n"),
                    )
                  }
                >
                  <Download className="size-4" /> Error report
                </Button>
              )}
              <Button
                size="sm"
                disabled={!report?.rows.length || busy}
                onClick={async () => {
                  setBusy(true);
                  await onImport(report!.rows);
                  setBusy(false);
                  toast.success(`${report!.rows.length} ${label} imported`);
                  setReport(null);
                }}
              >
                Import {report?.rows.length ?? 0} row(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
