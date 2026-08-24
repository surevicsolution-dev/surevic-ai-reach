import type { DocItem, Party, Product } from "./types";

/* ---------- primitives ---------- */

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function download(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export interface ImportResult<T> {
  rows: T[];
  errors: { line: number; message: string }[];
}

function toRecords(text: string, required: string[]): { records: Record<string, string>[]; errors: { line: number; message: string }[] } {
  const grid = parseCsv(text);
  const errors: { line: number; message: string }[] = [];
  if (!grid.length) return { records: [], errors: [{ line: 0, message: "File is empty" }] };
  const headers = grid[0]!.map((h) => h.trim().toLowerCase());
  const missing = required.filter((r) => !headers.includes(r));
  if (missing.length) return { records: [], errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}` }] };
  const records = grid.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
  return { records, errors };
}

const num = (v: string | undefined, fallback = 0) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/* ---------- parties ---------- */

export const PARTY_HEADERS = [
  "name", "type", "gstin", "pan", "state", "state_code",
  "billing_address", "shipping_address", "phone", "email", "credit_limit", "opening_balance",
];

export function partiesToCsv(rows: Party[]) {
  return toCsv(
    PARTY_HEADERS,
    rows.map((p) => [
      p.name, p.type, p.gstin, p.pan, p.state, p.stateCode,
      p.billingAddress, p.shippingAddress, p.phone, p.email, p.creditLimit, p.openingBalance,
    ]),
  );
}

export function parsePartiesCsv(text: string, companyId: string, newId: () => string): ImportResult<Party> {
  const { records, errors } = toRecords(text, ["name"]);
  const rows: Party[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    if (!r["name"]) { errors.push({ line, message: "Name is required" }); return; }
    const type = (r["type"] || "CUSTOMER").toUpperCase();
    if (!["CUSTOMER", "SUPPLIER", "BOTH"].includes(type)) {
      errors.push({ line, message: `Invalid type "${r["type"]}" (CUSTOMER | SUPPLIER | BOTH)` });
      return;
    }
    const gstin = (r["gstin"] || "").toUpperCase();
    if (gstin && !GSTIN_RE.test(gstin)) { errors.push({ line, message: `Invalid GSTIN "${gstin}"` }); return; }
    const stateCode = r["state_code"] || gstin.slice(0, 2);
    if (stateCode && !/^\d{1,2}$/.test(stateCode)) { errors.push({ line, message: `Invalid state code "${stateCode}"` }); return; }
    rows.push({
      id: newId(), companyId, name: r["name"]!, type: type as Party["type"],
      gstin, pan: (r["pan"] || "").toUpperCase(), state: r["state"] || "", stateCode,
      billingAddress: r["billing_address"] || "", shippingAddress: r["shipping_address"] || "",
      phone: r["phone"] || "", email: r["email"] || "",
      creditLimit: num(r["credit_limit"]), openingBalance: num(r["opening_balance"]),
    });
  });
  return { rows, errors };
}

/* ---------- products ---------- */

export const PRODUCT_HEADERS = [
  "name", "sku", "brand", "hsn", "unit", "cost_price", "selling_price", "tax_rate", "stock", "min_qty",
];

export function productsToCsv(rows: Product[]) {
  return toCsv(
    PRODUCT_HEADERS,
    rows.map((p) => [p.name, p.sku, p.brand, p.hsn, p.unit, p.costPrice, p.sellingPrice, p.taxRate, p.stock, p.minQty]),
  );
}

export function parseProductsCsv(text: string, companyId: string, newId: () => string): ImportResult<Product> {
  const { records, errors } = toRecords(text, ["name"]);
  const rows: Product[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    if (!r["name"]) { errors.push({ line, message: "Name is required" }); return; }
    const taxRate = r["tax_rate"] ? num(r["tax_rate"], -1) : 18;
    if (![0, 0.25, 3, 5, 12, 18, 28].includes(taxRate)) {
      errors.push({ line, message: `Invalid GST rate "${r["tax_rate"]}" (0, 5, 12, 18, 28)` });
      return;
    }
    const selling = num(r["selling_price"], -1);
    if (selling < 0) { errors.push({ line, message: "selling_price must be a number" }); return; }
    rows.push({
      id: newId(), companyId, name: r["name"]!, sku: r["sku"] || "", brand: r["brand"] || "",
      hsn: r["hsn"] || "", unit: r["unit"] || "NOS",
      costPrice: num(r["cost_price"]), sellingPrice: selling, taxRate,
      stock: num(r["stock"]), minQty: num(r["min_qty"]),
    });
  });
  return { rows, errors };
}

/* ---------- document line items ---------- */

export const ITEM_HEADERS = ["sku", "name", "hsn", "qty", "rate", "tax_rate", "unit"];

export function itemsToCsv(items: DocItem[], products: Product[]) {
  return toCsv(
    ITEM_HEADERS,
    items.map((i) => [
      products.find((p) => p.id === i.productId)?.sku ?? "",
      i.name, i.hsn, i.qty, i.rate, i.taxRate, i.unit,
    ]),
  );
}

export function parseItemsCsv(text: string, products: Product[]): ImportResult<DocItem> {
  const { records, errors } = toRecords(text, ["qty"]);
  const rows: DocItem[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const key = (r["sku"] || "").toLowerCase();
    const name = (r["name"] || "").toLowerCase();
    const p =
      products.find((x) => x.sku.toLowerCase() === key && key) ??
      products.find((x) => x.name.toLowerCase() === name && name);
    if (!p) { errors.push({ line, message: `No product matched sku "${r["sku"]}" / name "${r["name"]}"` }); return; }
    const qty = num(r["qty"], 0);
    if (qty <= 0) { errors.push({ line, message: "qty must be greater than 0" }); return; }
    rows.push({
      productId: p.id,
      name: p.name,
      hsn: r["hsn"] || p.hsn,
      qty,
      rate: r["rate"] ? num(r["rate"], p.sellingPrice) : p.sellingPrice,
      taxRate: r["tax_rate"] ? num(r["tax_rate"], p.taxRate) : p.taxRate,
      unit: r["unit"] || p.unit,
    });
  });
  return { rows, errors };
}
