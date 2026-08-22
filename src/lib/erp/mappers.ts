import type { Database } from "@/integrations/supabase/types";
import type { Company, Doc, DocItem, Party, Payment, Product } from "./types";

type Tables = Database["public"]["Tables"];
export type CompanyRow = Tables["companies"]["Row"];
export type PartyRow = Tables["parties"]["Row"];
export type ProductRow = Tables["products"]["Row"];
export type DocRow = Tables["docs"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];
export type AuditRow = Tables["audit_log"]["Row"];

export interface AuditEntry {
  id: string;
  companyId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export const toCompany = (r: CompanyRow): Company => ({
  id: r.id,
  name: r.name,
  legalName: r.legal_name,
  gstin: r.gstin,
  pan: r.pan,
  state: r.state,
  stateCode: r.state_code,
  address: r.address,
  phone: r.phone,
  email: r.email,
  website: r.website,
  bankName: r.bank_name,
  accountNo: r.account_no,
  ifsc: r.ifsc,
  upiId: r.upi_id,
  invoicePrefix: r.invoice_prefix,
  quotePrefix: r.quote_prefix,
  terms: r.terms ?? [],
});

export const fromCompany = (c: Partial<Company>): Partial<CompanyRow> => {
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
  return o as Partial<CompanyRow>;
};

export const toParty = (r: PartyRow): Party => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  type: r.type as Party["type"],
  gstin: r.gstin,
  pan: r.pan,
  state: r.state,
  stateCode: r.state_code,
  billingAddress: r.billing_address,
  shippingAddress: r.shipping_address,
  phone: r.phone,
  email: r.email,
  creditLimit: Number(r.credit_limit),
  openingBalance: Number(r.opening_balance),
});

export const fromParty = (p: Party) => ({
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

export const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  sku: r.sku,
  brand: r.brand,
  hsn: r.hsn,
  unit: r.unit,
  costPrice: Number(r.cost_price),
  sellingPrice: Number(r.selling_price),
  taxRate: Number(r.tax_rate),
  stock: Number(r.stock),
  minQty: Number(r.min_qty),
});

export const fromProduct = (p: Product) => ({
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

export const toDoc = (r: DocRow): Doc => ({
  id: r.id,
  companyId: r.company_id,
  kind: r.kind as Doc["kind"],
  number: r.number,
  date: r.date,
  ...(r.due_date ? { dueDate: r.due_date } : {}),
  partyId: r.party_id ?? "",
  items: (r.items as unknown as DocItem[]) ?? [],
  status: r.status as Doc["status"],
  ...(r.notes ? { notes: r.notes } : {}),
  ...(r.po_ref ? { poRef: r.po_ref } : {}),
  ...(r.follow_up_date ? { followUpDate: r.follow_up_date } : {}),
  ...(r.converted_to ? { convertedTo: r.converted_to } : {}),
});

export const fromDoc = (d: Doc) => ({
  id: d.id,
  company_id: d.companyId,
  kind: d.kind,
  number: d.number,
  date: d.date,
  due_date: d.dueDate ?? null,
  party_id: d.partyId || null,
  items: d.items as unknown as Database["public"]["Tables"]["docs"]["Insert"]["items"],
  status: d.status,
  notes: d.notes ?? null,
  po_ref: d.poRef ?? null,
  follow_up_date: d.followUpDate ?? null,
  converted_to: d.convertedTo ?? null,
});

export const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  companyId: r.company_id,
  date: r.date,
  partyId: r.party_id ?? "",
  ...(r.invoice_id ? { invoiceId: r.invoice_id } : {}),
  amount: Number(r.amount),
  mode: r.mode as Payment["mode"],
  reference: r.reference,
  direction: r.direction as Payment["direction"],
  ...(r.note ? { note: r.note } : {}),
});

export const fromPayment = (p: Payment) => ({
  id: p.id,
  company_id: p.companyId,
  date: p.date,
  party_id: p.partyId || null,
  invoice_id: p.invoiceId ?? null,
  amount: p.amount,
  mode: p.mode,
  reference: p.reference,
  direction: p.direction,
  note: p.note ?? null,
});

export const toAudit = (r: AuditRow): AuditEntry => ({
  id: r.id,
  companyId: r.company_id,
  userEmail: r.user_email,
  action: r.action,
  entity: r.entity,
  entityId: r.entity_id,
  summary: r.summary,
  createdAt: r.created_at,
});
