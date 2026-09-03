import { amountInWords, computeTotals, fmtDate, num } from "@/lib/erp/gst";
import type { Company, Doc, Party } from "@/lib/erp/types";

export function PrintSheet({ doc, company, party }: { doc: Doc; company: Company; party?: Party }) {
  const t = computeTotals(doc.items, company, party);
  const title = doc.kind === "INVOICE" ? "TAX INVOICE" : "QUOTATION";

  return (
    <div className="print-sheet border text-[11px] leading-snug shadow-[var(--shadow-panel)]">
      <div className="border border-neutral-400">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-400 p-3">
          <div>
            <h1 className="text-lg font-bold">{company.legalName}</h1>
            <p className="max-w-[95mm]">{company.address}</p>
            <p>
              Ph: {company.phone} · {company.email} · {company.website}
            </p>
            <p className="font-semibold">
              GSTIN: {company.gstin} · PAN: {company.pan}
            </p>
            <p>
              State: {company.state} · Code: {company.stateCode}
            </p>
          </div>
          <div className="text-right">
            <p className="inline-block border border-neutral-400 px-3 py-1 text-sm font-bold tracking-wide">{title}</p>
            <p className="mt-2">
              <span className="font-semibold">No:</span> {doc.number}
            </p>
            <p>
              <span className="font-semibold">Date:</span> {fmtDate(doc.date)}
            </p>
            {doc.dueDate && (
              <p>
                <span className="font-semibold">Due:</span> {fmtDate(doc.dueDate)}
              </p>
            )}
            {doc.poRef && (
              <p>
                <span className="font-semibold">PO Ref:</span> {doc.poRef}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-neutral-400">
          {(["Bill To", "Ship To"] as const).map((label, i) => (
            <div key={label} className={i === 0 ? "border-r border-neutral-400 p-3" : "p-3"}>
              <p className="mb-1 font-bold uppercase tracking-wide">{label}</p>
              <p className="font-semibold">{party?.name ?? "—"}</p>
              <p className="max-w-[85mm]">{i === 0 ? party?.billingAddress : party?.shippingAddress || party?.billingAddress}</p>
              <p>GSTIN: {party?.gstin ?? "—"}</p>
              <p>
                State: {party?.state} · Code: {party?.stateCode}
              </p>
              {i === 0 && <p>Ph: {party?.phone}</p>}
            </div>
          ))}
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {["#", "Description", "HSN/SAC", "Qty", "Rate", "Disc %", "Discount", "Taxable", t.interState ? "IGST" : "CGST", t.interState ? "" : "SGST", "Amount"]
                .filter((h) => h !== "")
                .map((h) => (
                  <th key={h} className="border border-neutral-400 px-1.5 py-1 text-[10px] font-bold uppercase">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {t.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-neutral-400 px-1.5 py-1 text-center">{i + 1}</td>
                <td className="border border-neutral-400 px-1.5 py-1">{it.name}</td>
                <td className="border border-neutral-400 px-1.5 py-1 text-center">{it.hsn}</td>
                <td className="border border-neutral-400 px-1.5 py-1 text-right">
                  {num(it.qty)} {it.unit}
                </td>
                <td className="border border-neutral-400 px-1.5 py-1 text-right">{num(it.rate)}</td>
                <td className="border border-neutral-400 px-1.5 py-1 text-right">{num(it.discountPct ?? 0)}%</td>
                <td className="border border-neutral-400 px-1.5 py-1 text-right">{num(it.discount)}</td>
                <td className="border border-neutral-400 px-1.5 py-1 text-right">{num(it.taxable)}</td>
                {t.interState ? (
                  <td className="border border-neutral-400 px-1.5 py-1 text-right">
                    {num(it.igst)} <span className="text-[9px]">({it.taxRate}%)</span>
                  </td>
                ) : (
                  <>
                    <td className="border border-neutral-400 px-1.5 py-1 text-right">
                      {num(it.cgst)} <span className="text-[9px]">({it.taxRate / 2}%)</span>
                    </td>
                    <td className="border border-neutral-400 px-1.5 py-1 text-right">
                      {num(it.sgst)} <span className="text-[9px]">({it.taxRate / 2}%)</span>
                    </td>
                  </>
                )}
                <td className="border border-neutral-400 px-1.5 py-1 text-right font-semibold">{num(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 border-t border-neutral-400">
          <div className="border-r border-neutral-400 p-3">
            <p className="font-bold uppercase">Amount in Words</p>
            <p className="mb-3 italic">{amountInWords(t.grandTotal)}</p>
            <p className="font-bold uppercase">Bank Details (RTGS / NEFT)</p>
            <p>Bank: {company.bankName}</p>
            <p>A/C No: {company.accountNo}</p>
            <p>IFSC: {company.ifsc}</p>
            <p>UPI: {company.upiId}</p>
            <div className="mt-2 grid size-[22mm] place-items-center border border-dashed border-neutral-400 text-center text-[8px] text-neutral-500">
              UPI QR
            </div>
          </div>
          <div className="p-0">
            <table className="w-full border-collapse">
              <tbody>
                {[
                  ["Subtotal (Gross)", t.subtotal],
                  ["Total Discount", t.discountTotal],
                  ["Taxable Value", t.taxable],
                  ...(t.interState ? ([["IGST", t.igst]] as [string, number][]) : ([["CGST", t.cgst], ["SGST", t.sgst]] as [string, number][])),
                  ["Round Off", t.roundOff],
                ].map(([label, val]) => (
                  <tr key={String(label)}>
                    <td className="border-b border-neutral-300 px-3 py-1">{label}</td>
                    <td className="border-b border-l border-neutral-300 px-3 py-1 text-right">{num(Number(val))}</td>
                  </tr>
                ))}
                <tr className="bg-neutral-100 font-bold">
                  <td className="px-3 py-1.5">GRAND TOTAL</td>
                  <td className="border-l border-neutral-300 px-3 py-1.5 text-right">₹ {num(t.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex h-[32mm] flex-col justify-between p-3 text-right">
              <p className="font-semibold">For {company.legalName}</p>
              <p className="border-t border-neutral-400 pt-1 text-[10px]">Authorised Signatory</p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-400 p-3">
          <p className="font-bold uppercase">Terms &amp; Conditions</p>
          <ol className="ml-4 list-decimal">
            {company.terms.map((tc) => (
              <li key={tc}>{tc}</li>
            ))}
          </ol>
          {doc.notes && <p className="mt-2 italic">Note: {doc.notes}</p>}
          <p className="mt-2 text-center text-[9px] text-neutral-500">
            This is a computer-generated document. E. &amp; O.E.
          </p>
        </div>
      </div>
    </div>
  );
}
