import type { DocItem, Party, Product } from "./types";

/* ---------------- generic csv helpers ---------------- */

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult<T> {
  rows: T[];
  errors: { row: number; message: string }[];
  skipped: number;
}

function indexHeaders(header: string[]) {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(h.trim().toLowerCase(), i));
  return map;
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ---------------- parties ---------------- */

export const PARTY_HEADERS = [
  "name", "type", "gstin", "pan", "state", "stateCode",
  "billingAddress", "shippingAddress", "phone", "email", "creditLimit", "openingBalance",
];

export const partiesToCsv = (parties: Party[]) =>
  toCsv(PARTY_HEADERS, parties.map((p) => [
    p.name, p.type, p.gstin, p.pan, p.state, p.stateCode,
    p.billingAddress, p.shippingAddress, p.phone, p.email, p.creditLimit, p.openingBalance,
  ]));

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function parsePartiesCsv(text: string, companyId: string, newId: () => string): ImportResult<Party> {
  const grid = parseCsv(text);
  const errors: ImportResult<Party>["errors"] = [];
  const rows: Party[] = [];
  if (!grid.length) return { rows, errors: [{ row: 0, message: "File is empty" }], skipped: 0 };
  const h = indexHeaders(grid[0]!);
  if (!h.has("name")) return { rows, errors: [{ row: 1, message: "Missing required column: name" }], skipped: 0 };

  grid.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => (h.has(k) ? (r[h.get(k)!] ?? "").trim() : "");
    const name = get("name");
    if (!name) { errors.push({ row: line, message: "name is required" }); return; }
    const gstin = get("gstin").toUpperCase();
    if (gstin && !GSTIN_RE.test(gstin)) { errors.push({ row: line, message: `Invalid GSTIN "${gstin}"` }); return; }
    const type = (get("type") || "CUSTOMER").toUpperCase();
    if (!["CUSTOMER", "SUPPLIER", "BOTH"].includes(type)) {
      errors.push({ row: line, message: `type must be CUSTOMER, SUPPLIER or BOTH (got "${type}")` });
      return;
    }
    const stateCode = get("statecode") || gstin.slice(0, 2);
    rows.push({
      id: newId(), companyId, name, type: type as Party["type"], gstin,
      pan: get("pan").toUpperCase() || gstin.slice(2, 12),
      state: get("state"), stateCode,
      billingAddress: get("billingaddress"), shippingAddress: get("shippingaddress") || get("billingaddress"),
      phone: get("phone"), email: get("email"),
      creditLimit: num(get("creditlimit")), openingBalance: num(get("openingbalance")),
    });
  });
  return { rows, errors, skipped: errors.length };
}

/* ---------------- products ---------------- */

export const PRODUCT_HEADERS = [
  "name", "sku", "brand", "hsn", "unit", "costPrice", "sellingPrice", "taxRate", "stock", "minQty",
];

export const productsToCsv = (products: Product[]) =>
  toCsv(PRODUCT_HEADERS, products.map((p) => [
    p.name, p.sku, p.brand, p.hsn, p.unit, p.costPrice, p.sellingPrice, p.taxRate, p.stock, p.minQty,
  ]));

export function parseProductsCsv(text: string, companyId: string, newId: () => string): ImportResult<Product> {
  const grid = parseCsv(text);
  const errors: ImportResult<Product>["errors"] = [];
  const rows: Product[] = [];
  if (!grid.length) return { rows, errors: [{ row: 0, message: "File is empty" }], skipped: 0 };
  const h = indexHeaders(grid[0]!);
  if (!h.has("name")) return { rows, errors: [{ row: 1, message: "Missing required column: name" }], skipped: 0 };

  grid.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => (h.has(k) ? (r[h.get(k)!] ?? "").trim() : "");
    const name = get("name");
    if (!name) { errors.push({ row: line, message: "name is required" }); return; }
    const taxRate = get("taxrate") === "" ? 18 : num(get("taxrate"));
    if (![0, 0.25, 3, 5, 12, 18, 28].includes(taxRate)) {
      errors.push({ row: line, message: `taxRate ${taxRate}% is not a valid GST slab` });
      return;
    }
    const selling = num(get("sellingprice"));
    if (selling < 0) { errors.push({ row: line, message: "sellingPrice cannot be negative" }); return; }
    rows.push({
      id: newId(), companyId, name, sku: get("sku"), brand: get("brand"), hsn: get("hsn"),
      unit: get("unit") || "NOS",
      costPrice: num(get("costprice")), sellingPrice: selling, taxRate,
      stock: num(get("stock")), minQty: num(get("minqty")),
    });
  });
  return { rows, errors, skipped: errors.length };
}

/* ---------------- document line items ---------------- */

export const ITEM_HEADERS = ["sku", "name", "hsn", "qty", "rate", "taxRate", "unit"];

export const itemsToCsv = (items: DocItem[], products: Product[]) =>
  toCsv(ITEM_HEADERS, items.map((i) => [
    products.find((p) => p.id === i.productId)?.sku ?? "",
    i.name, i.hsn, i.qty, i.rate, i.taxRate, i.unit,
  ]));

export function parseItemsCsv(text: string, products: Product[]): ImportResult<DocItem> {
  const grid = parseCsv(text);
  const errors: ImportResult<DocItem>["errors"] = [];
  const rows: DocItem[] = [];
  if (!grid.length) return { rows, errors: [{ row: 0, message: "File is empty" }], skipped: 0 };
  const h = indexHeaders(grid[0]!);
  if (!h.has("sku") && !h.has("name")) {
    return { rows, errors: [{ row: 1, message: "Need a sku or name column" }], skipped: 0 };
  }

  grid.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => (h.has(k) ? (r[h.get(k)!] ?? "").trim() : "");
    const sku = get("sku");
    const name = get("name");
    const p =
      (sku && products.find((x) => x.sku.toLowerCase() === sku.toLowerCase())) ||
      (name && products.find((x) => x.name.toLowerCase() === name.toLowerCase())) ||
      undefined;
    if (!p) { errors.push({ row: line, message: `No product matches "${sku || name}"` }); return; }
    const qty = num(get("qty"));
    if (qty <= 0) { errors.push({ row: line, message: "qty must be greater than 0" }); return; }
    const rate = get("rate") === "" ? p.sellingPrice : num(get("rate"));
    rows.push({
      productId: p.id, name: p.name, hsn: p.hsn, qty, rate,
      taxRate: get("taxrate") === "" ? p.taxRate : num(get("taxrate")),
      unit: get("unit") || p.unit,
    });
  });
  return { rows, errors, skipped: errors.length };
}

export function formatErrorReport(errors: { row: number; message: string }[]) {
  return toCsv(["row", "error"], errors.map((e) => [e.row, e.message]));
}
