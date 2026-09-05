import type { Company, Doc, DocItem, Party, Payment, Product } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const toCompany = (r: any): Company => ({
  id: r.id,
  name: r.name ?? "",
  legalName: r.legal_name ?? "",
  gstin: r.gstin ?? "",
  pan: r.pan ?? "",
  state: r.state ?? "",
  stateCode: r.state_code ?? "",
  address: r.address ?? "",
  phone: r.phone ?? "",
  email: r.email ?? "",
  website: r.website ?? "",
  bankName: r.bank_name ?? "",
  accountNo: r.account_no ?? "",
  ifsc: r.ifsc ?? "",
  upiId: r.upi_id ?? "",
  invoicePrefix: r.invoice_prefix ?? "INV-",
  quotePrefix: r.quote_prefix ?? "QTN-",
  terms: (r.terms ?? []) as string[],
  country: r.country ?? "India",
  baseCurrency: r.base_currency ?? "INR",
  fyStartMonth: Number(r.fy_start_month ?? 4),
  industry: r.industry ?? "",
  trialEndsAt: r.trial_ends_at ?? "",
});

export const fromCompany = (c: Partial<Company>): any => {
  const o: Record<string, unknown> = {};
  if (c.name !== undefined) o["name"] = c.name;
  if (c.legalName !== undefined) o["legal_name"] = c.legalName;
  if (c.gstin !== undefined) o["gstin"] = c.gstin;
  if (c.pan !== undefined) o["pan"] = c.pan;
  if (c.state !== undefined) o["state"] = c.state;
  if (c.stateCode !== undefined) o["state_code"] = c.stateCode;
  if (c.address !== undefined) o["address"] = c.address;
  if (c.phone !== undefined) o["phone"] = c.phone;
  if (c.email !== undefined) o["email"] = c.email;
  if (c.website !== undefined) o["website"] = c.website;
  if (c.bankName !== undefined) o["bank_name"] = c.bankName;
  if (c.accountNo !== undefined) o["account_no"] = c.accountNo;
  if (c.ifsc !== undefined) o["ifsc"] = c.ifsc;
  if (c.upiId !== undefined) o["upi_id"] = c.upiId;
  if (c.invoicePrefix !== undefined) o["invoice_prefix"] = c.invoicePrefix;
  if (c.quotePrefix !== undefined) o["quote_prefix"] = c.quotePrefix;
  if (c.terms !== undefined) o["terms"] = c.terms;
  if (c.country !== undefined) o["country"] = c.country;
  if (c.baseCurrency !== undefined) o["base_currency"] = c.baseCurrency;
  if (c.fyStartMonth !== undefined) o["fy_start_month"] = c.fyStartMonth;
  if (c.industry !== undefined) o["industry"] = c.industry;
  return o;
};


export const toParty = (r: any): Party => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  type: r.type,
  gstin: r.gstin ?? "",
  pan: r.pan ?? "",
  state: r.state ?? "",
  stateCode: r.state_code ?? "",
  billingAddress: r.billing_address ?? "",
  shippingAddress: r.shipping_address ?? "",
  phone: r.phone ?? "",
  email: r.email ?? "",
  creditLimit: Number(r.credit_limit ?? 0),
  openingBalance: Number(r.opening_balance ?? 0),
});

export const fromParty = (p: Party): any => ({
  id: p.id,
  company_id: p.companyId,
  name: p.name,
  type: p.type,
  gstin: p.gstin,
  pan: p.pan,
  state: p.state,
  state_code: p.stateCode,
  billing_address: p.billingAddress,
  shipping_address: p.shippingAddress,
  phone: p.phone,
  email: p.email,
  credit_limit: p.creditLimit,
  opening_balance: p.openingBalance,
});

export const toProduct = (r: any): Product => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  sku: r.sku ?? "",
  brand: r.brand ?? "",
  hsn: r.hsn ?? "",
  unit: r.unit ?? "NOS",
  costPrice: Number(r.cost_price ?? 0),
  sellingPrice: Number(r.selling_price ?? 0),
  taxRate: Number(r.tax_rate ?? 18),
  stock: Number(r.stock ?? 0),
  minQty: Number(r.min_qty ?? 0),
});

export const fromProduct = (p: Product): any => ({
  id: p.id,
  company_id: p.companyId,
  name: p.name,
  sku: p.sku,
  brand: p.brand,
  hsn: p.hsn,
  unit: p.unit,
  cost_price: p.costPrice,
  selling_price: p.sellingPrice,
  tax_rate: p.taxRate,
  stock: p.stock,
  min_qty: p.minQty,
});

export const toDoc = (r: any): Doc => ({
  id: r.id,
  companyId: r.company_id,
  kind: r.kind,
  number: r.number,
  date: r.date,
  dueDate: r.due_date ?? undefined,
  partyId: r.party_id,
  items: (r.items ?? []) as DocItem[],
  status: r.status,
  notes: r.notes ?? undefined,
  poRef: r.po_ref ?? undefined,
  followUpDate: r.follow_up_date ?? undefined,
  convertedTo: r.converted_to ?? undefined,
});

export const fromDoc = (d: Doc): any => ({
  id: d.id,
  company_id: d.companyId,
  kind: d.kind,
  number: d.number,
  date: d.date,
  due_date: d.dueDate ?? null,
  party_id: d.partyId,
  items: d.items,
  status: d.status,
  notes: d.notes ?? null,
  po_ref: d.poRef ?? null,
  follow_up_date: d.followUpDate ?? null,
  converted_to: d.convertedTo ?? null,
});

export const toPayment = (r: any): Payment => ({
  id: r.id,
  companyId: r.company_id,
  date: r.date,
  partyId: r.party_id,
  invoiceId: r.invoice_id ?? undefined,
  amount: Number(r.amount ?? 0),
  mode: r.mode,
  reference: r.reference ?? "",
  direction: r.direction,
  note: r.note ?? undefined,
});

export const fromPayment = (p: Payment): any => ({
  id: p.id,
  company_id: p.companyId,
  date: p.date,
  party_id: p.partyId,
  invoice_id: p.invoiceId ?? null,
  amount: p.amount,
  mode: p.mode,
  reference: p.reference,
  direction: p.direction,
  note: p.note ?? null,
});

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  userEmail: string;
  createdAt: string;
}

export const toAudit = (r: any): AuditEntry => ({
  id: r.id,
  action: r.action,
  entity: r.entity,
  entityId: r.entity_id ?? "",
  summary: r.summary ?? "",
  userEmail: r.user_email ?? "",
  createdAt: r.created_at,
});
