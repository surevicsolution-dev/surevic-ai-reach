import type { Company, Doc, ErpState, Party, Payment, Product } from "./types";

const CO = "co_surevic";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));
const daysAhead = (n: number) => iso(new Date(Date.now() + n * 86400000));

export const seedCompany: Company = {
  id: CO,
  name: "Surevic Automation",
  legalName: "Surevic Automation Pvt. Ltd.",
  gstin: "27ABKCS4321L1ZP",
  pan: "ABKCS4321L",
  state: "Maharashtra",
  stateCode: "27",
  address: "Unit 14, Sai Industrial Estate, Andheri East, Mumbai 400093",
  phone: "+91 98200 41155",
  email: "sales@surevic.in",
  website: "www.surevic.in",
  bankName: "HDFC Bank, Andheri East Branch",
  accountNo: "50200048817726",
  ifsc: "HDFC0000521",
  upiId: "surevic@hdfcbank",
  invoicePrefix: "SV-INV-",
  quotePrefix: "SV-QT-",
  terms: [
    "Payment due within 30 days from invoice date.",
    "Interest @18% p.a. applicable on delayed payments.",
    "Goods once sold will not be taken back or exchanged.",
    "Warranty as per respective OEM standard terms.",
    "Subject to Mumbai jurisdiction only.",
  ],
};

export const seedParties: Party[] = [
  {
    id: "pt_1", companyId: CO, name: "Tata Motors Ltd.", type: "CUSTOMER",
    gstin: "27AAACT2727Q1ZW", pan: "AAACT2727Q", state: "Maharashtra", stateCode: "27",
    billingAddress: "Pimpri Plant, Mumbai-Pune Road, Pimpri, Pune 411018",
    shippingAddress: "Stores Gate 3, Pimpri Plant, Pune 411018",
    phone: "+91 20 6613 2000", email: "purchase.pimpri@tatamotors.com",
    creditLimit: 2500000, openingBalance: 0,
  },
  {
    id: "pt_2", companyId: CO, name: "Bharat Forge Ltd.", type: "CUSTOMER",
    gstin: "27AAACB2588H1ZL", pan: "AAACB2588H", state: "Maharashtra", stateCode: "27",
    billingAddress: "Mundhwa, Pune Cantonment, Pune 411036",
    shippingAddress: "Mundhwa Works, Gate 2, Pune 411036",
    phone: "+91 20 6704 2777", email: "mro@bharatforge.com",
    creditLimit: 1500000, openingBalance: 125000,
  },
  {
    id: "pt_3", companyId: CO, name: "Amara Raja Batteries Ltd.", type: "CUSTOMER",
    gstin: "37AABCA6884L1Z6", pan: "AABCA6884L", state: "Andhra Pradesh", stateCode: "37",
    billingAddress: "Renigunta-Cuddapah Road, Karakambadi, Tirupati 517520",
    shippingAddress: "Plant 2 Stores, Karakambadi, Tirupati 517520",
    phone: "+91 877 226 5000", email: "stores@amararaja.co.in",
    creditLimit: 1000000, openingBalance: 0,
  },
  {
    id: "pt_4", companyId: CO, name: "Shakti Packaging Systems", type: "CUSTOMER",
    gstin: "24AAGFS8899K1ZT", pan: "AAGFS8899K", state: "Gujarat", stateCode: "24",
    billingAddress: "Plot 210, GIDC Vatva Phase 3, Ahmedabad 382445",
    shippingAddress: "Plot 210, GIDC Vatva Phase 3, Ahmedabad 382445",
    phone: "+91 79 2583 1140", email: "accounts@shaktipack.in",
    creditLimit: 500000, openingBalance: 0,
  },
  {
    id: "pt_5", companyId: CO, name: "Precision Controls & Drives", type: "BOTH",
    gstin: "29AAJCP1122M1ZQ", pan: "AAJCP1122M", state: "Karnataka", stateCode: "29",
    billingAddress: "No. 48, Peenya Industrial Area Phase 1, Bengaluru 560058",
    shippingAddress: "No. 48, Peenya Industrial Area Phase 1, Bengaluru 560058",
    phone: "+91 80 2839 4411", email: "info@precisioncd.in",
    creditLimit: 750000, openingBalance: 0,
  },
  {
    id: "pt_6", companyId: CO, name: "SICK India Pvt. Ltd.", type: "SUPPLIER",
    gstin: "27AABCS9034F1ZK", pan: "AABCS9034F", state: "Maharashtra", stateCode: "27",
    billingAddress: "Unit 405, Hiranandani Business Park, Powai, Mumbai 400076",
    shippingAddress: "Unit 405, Hiranandani Business Park, Powai, Mumbai 400076",
    phone: "+91 22 6119 8900", email: "orders@sick.in",
    creditLimit: 0, openingBalance: 0,
  },
  {
    id: "pt_7", companyId: CO, name: "Siemens Ltd. (Channel)", type: "SUPPLIER",
    gstin: "27AAACS0764L1ZH", pan: "AAACS0764L", state: "Maharashtra", stateCode: "27",
    billingAddress: "Birla Aurora, Worli, Mumbai 400030",
    shippingAddress: "Kalwa Works, Thane 400605",
    phone: "+91 22 3967 7000", email: "channel.in@siemens.com",
    creditLimit: 0, openingBalance: 0,
  },
];

export const seedProducts: Product[] = [
  { id: "pr_1", companyId: CO, name: "SICK WTB4-3P2361 Photoelectric Proximity Sensor", sku: "SICK-WTB4-3P2361", brand: "SICK", hsn: "85365090", unit: "NOS", costPrice: 5400, sellingPrice: 7250, taxRate: 18, stock: 42, minQty: 15 },
  { id: "pr_2", companyId: CO, name: "SICK DT35-B15251 Distance Laser Sensor", sku: "SICK-DT35-B15251", brand: "SICK", hsn: "90318000", unit: "NOS", costPrice: 42500, sellingPrice: 54900, taxRate: 18, stock: 6, minQty: 8 },
  { id: "pr_3", companyId: CO, name: "SICK C4000 Safety Light Curtain 900mm", sku: "SICK-C4000-900", brand: "SICK", hsn: "85365090", unit: "SET", costPrice: 118000, sellingPrice: 149500, taxRate: 18, stock: 3, minQty: 2 },
  { id: "pr_4", companyId: CO, name: "Siemens S7-1200 CPU 1214C DC/DC/DC", sku: "6ES7214-1AG40-0XB0", brand: "Siemens", hsn: "85371000", unit: "NOS", costPrice: 28900, sellingPrice: 36500, taxRate: 18, stock: 18, minQty: 6 },
  { id: "pr_5", companyId: CO, name: "Siemens SIMATIC HMI KTP700 Basic Panel", sku: "6AV2123-2GB03-0AX0", brand: "Siemens", hsn: "85371000", unit: "NOS", costPrice: 41500, sellingPrice: 52000, taxRate: 18, stock: 9, minQty: 4 },
  { id: "pr_6", companyId: CO, name: "Siemens G120C VFD 5.5kW 3-Phase", sku: "6SL3210-1KE18-8UF1", brand: "Siemens", hsn: "85044090", unit: "NOS", costPrice: 47800, sellingPrice: 61200, taxRate: 18, stock: 4, minQty: 5 },
  { id: "pr_7", companyId: CO, name: "Omron E3Z-D62 Diffuse Photoelectric Sensor", sku: "OMR-E3Z-D62", brand: "Omron", hsn: "85365090", unit: "NOS", costPrice: 2450, sellingPrice: 3350, taxRate: 18, stock: 120, minQty: 30 },
  { id: "pr_8", companyId: CO, name: "Omron MY2N-GS Relay 24VDC with Socket", sku: "OMR-MY2N-GS-24", brand: "Omron", hsn: "85364900", unit: "NOS", costPrice: 320, sellingPrice: 520, taxRate: 18, stock: 480, minQty: 100 },
  { id: "pr_9", companyId: CO, name: "Omron E5CC-RX2ASM Temperature Controller", sku: "OMR-E5CC-RX2ASM", brand: "Omron", hsn: "90322000", unit: "NOS", costPrice: 6100, sellingPrice: 8400, taxRate: 18, stock: 22, minQty: 10 },
  { id: "pr_10", companyId: CO, name: "Phoenix Contact 24VDC 10A SMPS", sku: "PXC-QUINT-24-10", brand: "Phoenix Contact", hsn: "85044030", unit: "NOS", costPrice: 15800, sellingPrice: 20500, taxRate: 18, stock: 14, minQty: 6 },
  { id: "pr_11", companyId: CO, name: "Festo DSBC-32-100 Pneumatic Cylinder", sku: "FST-DSBC-32-100", brand: "Festo", hsn: "84123100", unit: "NOS", costPrice: 8900, sellingPrice: 11800, taxRate: 18, stock: 26, minQty: 10 },
  { id: "pr_12", companyId: CO, name: "Automation Panel Wiring & Commissioning Service", sku: "SVC-COMM-01", brand: "Surevic", hsn: "998719", unit: "DAY", costPrice: 4000, sellingPrice: 9500, taxRate: 18, stock: 999, minQty: 0 },
];

const item = (p: Product, qty: number, rate?: number) => ({
  productId: p.id, name: p.name, hsn: p.hsn, qty, rate: rate ?? p.sellingPrice, taxRate: p.taxRate, unit: p.unit,
});
const P = (id: string) => seedProducts.find((x) => x.id === id)!;

export const seedDocs: Doc[] = [
  {
    id: "dc_1", companyId: CO, kind: "INVOICE", number: "SV-INV-0231", date: daysAgo(74), dueDate: daysAgo(44),
    partyId: "pt_2", status: "UNPAID", poRef: "BFL/PO/24-25/8891", followUpDate: daysAgo(0),
    items: [item(P("pr_4"), 4), item(P("pr_5"), 2), item(P("pr_8"), 60)],
  },
  {
    id: "dc_2", companyId: CO, kind: "INVOICE", number: "SV-INV-0238", date: daysAgo(48), dueDate: daysAgo(18),
    partyId: "pt_1", status: "PARTIAL", poRef: "TML/PUR/9921",
    items: [item(P("pr_1"), 20), item(P("pr_7"), 35), item(P("pr_12"), 3)],
  },
  {
    id: "dc_3", companyId: CO, kind: "INVOICE", number: "SV-INV-0244", date: daysAgo(22), dueDate: daysAhead(8),
    partyId: "pt_3", status: "UNPAID", poRef: "ARBL/4471", followUpDate: daysAhead(0),
    items: [item(P("pr_3"), 1), item(P("pr_10"), 4)],
  },
  {
    id: "dc_4", companyId: CO, kind: "INVOICE", number: "SV-INV-0249", date: daysAgo(12), dueDate: daysAhead(18),
    partyId: "pt_4", status: "PAID",
    items: [item(P("pr_9"), 6), item(P("pr_11"), 8)],
  },
  {
    id: "dc_5", companyId: CO, kind: "INVOICE", number: "SV-INV-0252", date: daysAgo(5), dueDate: daysAhead(25),
    partyId: "pt_5", status: "UNPAID", poRef: "PCD/PO/1188", followUpDate: daysAhead(2),
    items: [item(P("pr_6"), 2), item(P("pr_2"), 1)],
  },
  {
    id: "dc_6", companyId: CO, kind: "QUOTATION", number: "SV-QT-0117", date: daysAgo(9),
    partyId: "pt_1", status: "SENT", notes: "Delivery: 2-3 weeks ex-stock Mumbai.",
    items: [item(P("pr_2"), 3), item(P("pr_12"), 2)],
  },
  {
    id: "dc_7", companyId: CO, kind: "QUOTATION", number: "SV-QT-0119", date: daysAgo(3),
    partyId: "pt_4", status: "DRAFT",
    items: [item(P("pr_7"), 50), item(P("pr_8"), 200)],
  },
  {
    id: "dc_8", companyId: CO, kind: "QUOTATION", number: "SV-QT-0120", date: daysAgo(1),
    partyId: "pt_3", status: "SENT", notes: "Prices valid for 15 days.",
    items: [item(P("pr_5"), 4), item(P("pr_4"), 4)],
  },
];

export const seedPayments: Payment[] = [
  { id: "py_1", companyId: CO, date: daysAgo(20), partyId: "pt_1", invoiceId: "dc_2", amount: 150000, mode: "BANK", reference: "NEFT/HDFC/882131", direction: "IN" },
  { id: "py_2", companyId: CO, date: daysAgo(6), partyId: "pt_4", invoiceId: "dc_4", amount: 170000, mode: "UPI", reference: "UPI/4471228831", direction: "IN" },
  { id: "py_3", companyId: CO, date: daysAgo(2), partyId: "pt_4", invoiceId: "dc_4", amount: 1000, mode: "CASH", reference: "CASH/0091", direction: "IN" },
];

export const seedState: ErpState = {
  company: seedCompany,
  role: "ADMIN",
  parties: seedParties,
  products: seedProducts,
  docs: seedDocs,
  payments: seedPayments,
};
