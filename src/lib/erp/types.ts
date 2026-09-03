export type Role = "ADMIN" | "SALES" | "ACCOUNTS" | "WAREHOUSE";

export type PartyType = "CUSTOMER" | "SUPPLIER" | "BOTH";

export type DocStatus = "DRAFT" | "SENT" | "ACCEPTED" | "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";

export type PaymentMode = "BANK" | "CHEQUE" | "UPI" | "CASH";

export interface Company {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  upiId: string;
  invoicePrefix: string;
  quotePrefix: string;
  terms: string[];
}

export interface Party {
  id: string;
  companyId: string;
  name: string;
  type: PartyType;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  billingAddress: string;
  shippingAddress: string;
  phone: string;
  email: string;
  creditLimit: number;
  openingBalance: number;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  brand: string;
  hsn: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  minQty: number;
}

export interface DocItem {
  productId: string;
  name: string;
  hsn: string;
  qty: number;
  rate: number;
  taxRate: number;
  unit: string;
  /** Discount percentage applied on gross (qty × rate) */
  discountPct?: number;
  /** Absolute discount in ₹ (takes precedence over discountPct when set) */
  discountAmt?: number;
}

export interface Doc {
  id: string;
  companyId: string;
  kind: "QUOTATION" | "INVOICE";
  number: string;
  date: string;
  dueDate?: string;
  partyId: string;
  items: DocItem[];
  status: DocStatus;
  notes?: string;
  poRef?: string;
  followUpDate?: string;
  convertedTo?: string;
}

export interface Payment {
  id: string;
  companyId: string;
  date: string;
  partyId: string;
  invoiceId?: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  direction: "IN" | "OUT";
  note?: string;
}

export interface ErpState {
  company: Company;
  role: Role;
  parties: Party[];
  products: Product[];
  docs: Doc[];
  payments: Payment[];
}
