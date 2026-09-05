import type { DocKind } from "./types";

export interface KindMeta {
  kind: DocKind;
  /** URL slug used by /doc/new/$kind */
  slug: string;
  label: string;
  plural: string;
  listPath: string;
  /** Fallback numbering prefix when the company has no custom one */
  prefix: string;
  partyLabel: string;
  partyKinds: ("CUSTOMER" | "SUPPLIER" | "BOTH")[];
  convertTo?: DocKind;
  convertLabel?: string;
}

export const DOC_KINDS: Record<DocKind, KindMeta> = {
  QUOTATION: {
    kind: "QUOTATION", slug: "quotation", label: "Quotation", plural: "Quotations",
    listPath: "/quotations", prefix: "QTN-", partyLabel: "Customer",
    partyKinds: ["CUSTOMER", "BOTH"], convertTo: "INVOICE", convertLabel: "Convert to tax invoice",
  },
  SALESORDER: {
    kind: "SALESORDER", slug: "sales-order", label: "Sales Order", plural: "Sales Orders",
    listPath: "/sales-orders", prefix: "SO-", partyLabel: "Customer",
    partyKinds: ["CUSTOMER", "BOTH"], convertTo: "INVOICE", convertLabel: "Convert to tax invoice",
  },
  PROFORMA: {
    kind: "PROFORMA", slug: "proforma", label: "Proforma Invoice", plural: "Proforma Invoices",
    listPath: "/proforma-invoices", prefix: "PI-", partyLabel: "Customer",
    partyKinds: ["CUSTOMER", "BOTH"], convertTo: "INVOICE", convertLabel: "Convert to final invoice",
  },
  INVOICE: {
    kind: "INVOICE", slug: "invoice", label: "Tax Invoice", plural: "Tax Invoices",
    listPath: "/invoices", prefix: "INV-", partyLabel: "Customer",
    partyKinds: ["CUSTOMER", "BOTH"],
  },
  PURCHASEORDER: {
    kind: "PURCHASEORDER", slug: "purchase-order", label: "Purchase Order", plural: "Purchase Orders",
    listPath: "/purchase-orders", prefix: "PO-", partyLabel: "Vendor",
    partyKinds: ["SUPPLIER", "BOTH"], convertTo: "BILL", convertLabel: "Convert to bill",
  },
  BILL: {
    kind: "BILL", slug: "bill", label: "Purchase Bill", plural: "Bills",
    listPath: "/bills", prefix: "BILL-", partyLabel: "Vendor",
    partyKinds: ["SUPPLIER", "BOTH"],
  },
};

export const kindFromSlug = (slug: string): DocKind =>
  (Object.values(DOC_KINDS).find((k) => k.slug === slug)?.kind ?? "INVOICE");

export const metaOf = (kind: DocKind) => DOC_KINDS[kind];
