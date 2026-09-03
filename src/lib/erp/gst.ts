import type { Company, Doc, DocItem, Party, Payment } from "./types";

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const num = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);

export interface ItemTax extends DocItem {
  gross: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface DocTotals {
  interState: boolean;
  items: ItemTax[];
  subtotal: number;
  discountTotal: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  taxSlabs: { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[];
}

/** Gross → discount → taxable for a single line item. */
export function lineMath(it: DocItem) {
  const gross = +((it.qty || 0) * (it.rate || 0)).toFixed(2);
  const raw =
    it.discountAmt !== undefined && it.discountAmt !== null && !Number.isNaN(it.discountAmt)
      ? it.discountAmt
      : (gross * (it.discountPct || 0)) / 100;
  const discount = +Math.min(Math.max(raw || 0, 0), gross).toFixed(2);
  const taxable = +(gross - discount).toFixed(2);
  const tax = +((taxable * (it.taxRate || 0)) / 100).toFixed(2);
  return { gross, discount, taxable, tax, total: +(taxable + tax).toFixed(2) };
}

export function computeTotals(items: DocItem[], company: Company, party?: Party): DocTotals {
  const interState = !!party && party.stateCode !== company.stateCode;
  const taxed: ItemTax[] = items.map((it) => {
    const { gross, discount, taxable, tax, total } = lineMath(it);
    const cgst = interState ? 0 : +(tax / 2).toFixed(2);
    const sgst = interState ? 0 : +(tax / 2).toFixed(2);
    const igst = interState ? tax : 0;
    return { ...it, gross, discount, taxable, cgst, sgst, igst, total };
  });

  const sum = (f: (i: ItemTax) => number) => +taxed.reduce((a, b) => a + f(b), 0).toFixed(2);
  const subtotal = sum((i) => i.gross);
  const discountTotal = sum((i) => i.discount);
  const taxable = sum((i) => i.taxable);
  const cgst = sum((i) => i.cgst);
  const sgst = sum((i) => i.sgst);
  const igst = sum((i) => i.igst);
  const taxTotal = +(cgst + sgst + igst).toFixed(2);
  const gross = +(taxable + taxTotal).toFixed(2);
  const grandTotal = Math.round(gross);
  const roundOff = +(grandTotal - gross).toFixed(2);

  const slabMap = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const i of taxed) {
    const s = slabMap.get(i.taxRate) ?? { rate: i.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    s.taxable += i.taxable;
    s.cgst += i.cgst;
    s.sgst += i.sgst;
    s.igst += i.igst;
    slabMap.set(i.taxRate, s);
  }

  return {
    interState,
    items: taxed,
    subtotal,
    discountTotal,
    taxable,
    cgst,
    sgst,
    igst,
    taxTotal,
    roundOff,
    grandTotal,
    taxSlabs: [...slabMap.values()].sort((a, b) => a.rate - b.rate),
  };
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = TENS[Math.floor(n / 10)] ?? "";
  return (t + (n % 10 ? " " + ONES[n % 10] : "")).trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

export function amountInWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - n) * 100);
  if (n === 0 && paise === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  let words = `${parts.join(" ")} Rupees`;
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`.replace(/\s+/g, " ");
}

export function docTotal(doc: Doc, company: Company, party?: Party) {
  return computeTotals(doc.items, company, party).grandTotal;
}

export function paidAgainst(invoiceId: string, payments: Payment[]) {
  return payments.filter((p) => p.invoiceId === invoiceId).reduce((a, b) => a + b.amount, 0);
}

export function daysOverdue(doc: Doc, today = new Date()) {
  if (!doc.dueDate) return 0;
  const d = Math.floor((today.getTime() - new Date(doc.dueDate).getTime()) / 86400000);
  return d > 0 ? d : 0;
}

export function agingBucket(days: number) {
  if (days <= 0) return "Current";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
